import { isTextEditable, activeElement } from "@src/lib/dom"
import { contentState, ModeName } from "@src/content/state_content"
import Logger from "@src/lib/logging"
import * as controller from "@src/lib/controller"
import {
    KeyEventLike,
    ParserResponse,
    minimalKeyFromKeyboardEvent,
    MinimalKey,
    formatKeysForModeIndicator,
    isTrustedKeyboardEvent,
    TrustedKeyboardEvent,
} from "@src/lib/keyseq"

import * as hinting from "@src/content/hinting"
import * as gobblemode from "@src/parsers/gobblemode"
import * as generic from "@src/parsers/genericmode"
import * as nmode from "@src/parsers/nmode"
import * as Messaging from "@src/lib/messaging"
import * as config from "@src/lib/config"
import { mode2maps } from "@src/lib/binding"

const logger = new Logger("controller")

function mapstrsForMode(mode: string) {
    const maps = config.getDynamic(mode2maps.get(mode) || mode + "maps")
    return Object.keys(maps || {})
}

/**
 * KeyCanceller: keep track of keys that have been cancelled in the keydown
 * handler (which takes care of dispatching ex commands) and also cancel them
 * in keypress/keyup event handlers. This fixes
 * https://github.com/tridactyl/tridactyl/issues/234.
 *
 * If you make modifications to this class, keep in mind that keyup events
 * might not arrive in the same order as the keydown events (e.g. user presses
 * A, then B, releases B and then A).
 */
class KeyCanceller {
    private keyPress: TrustedKeyboardEvent[] = []
    private keyUp: TrustedKeyboardEvent[] = []

    constructor() {
        this.cancelKeyUp = this.cancelKeyUp.bind(this)
        this.cancelKeyPress = this.cancelKeyPress.bind(this)
    }

    push(ke: TrustedKeyboardEvent) {
        ke.preventDefault()
        ke.stopImmediatePropagation()

        if (ke.type === "keydown") {
            this.keyPress.push(ke)
            this.keyUp.push(ke)
        } else if (ke.type === "keyup") {
            // only need to bookkeep, the keyup will be cancelled by the keydown
            this.removeKeys(ke, this.keyUp)
            this.removeKeys(ke, this.keyPress)
        }
    }

    public cancelKeyPress = (ke: TrustedKeyboardEvent) => {
        this.cancelKey(ke, this.keyPress)
    }

    public cancelKeyUp = (ke: TrustedKeyboardEvent) => {
        this.cancelKey(ke, this.keyUp)
        this.removeKeys(ke, this.keyUp)
        this.removeKeys(ke, this.keyPress)
    }

    private removeKeys(ke: TrustedKeyboardEvent, kes: TrustedKeyboardEvent[]) {
        while (this.removeKey(ke, kes)) {
            // Repeat keydowns can add duplicate cancellations.
        }
    }

    private removeKey(
        ke: TrustedKeyboardEvent,
        kes: TrustedKeyboardEvent[],
    ) {
        const index = kes.findIndex(
            ke2 =>
                ke.altKey === ke2.altKey &&
                ke.code === ke2.code &&
                ke.composed === ke2.composed &&
                ke.ctrlKey === ke2.ctrlKey &&
                ke.metaKey === ke2.metaKey &&
                ke.shiftKey === ke2.shiftKey &&
                (ke.type === "keyup" || ke.target === ke2.target),
        )
        if (index < 0) return false
        kes.splice(index, 1)
        return true
    }

    private cancelKey(
        ke: TrustedKeyboardEvent,
        kes: TrustedKeyboardEvent[],
    ) {
        if (this.removeKey(ke, kes)) {
            ke.preventDefault()
            ke.stopImmediatePropagation()
        }
    }
}

export const canceller = new KeyCanceller()

let mustBufferPageKeysForClInput = false
let bufferedPageKeys: string[] = []
let bufferingPageKeysBeginTime: number
Messaging.addListener(
    "stop_buffering_page_keys",
    (message, sender, sendResponse) => {
        const bufferingDuration = performance.now() - bufferingPageKeysBeginTime
        logger.debug(
            "stop_buffering_page_keys request received, responding with bufferedPageKeys = ",
            bufferedPageKeys +
                " bufferingDuration = " +
                bufferingDuration +
                "ms",
        )
        sendResponse(Promise.resolve(bufferedPageKeys))
        // At this point, clInput is focused and the page cannot get any more keyboard events
        // until it is refocused.
        mustBufferPageKeysForClInput = false
        bufferedPageKeys = []
    },
)

let keysToFeed: KeyEventLike[] = []
let generatorIsWaiting = true

/** Accepts keyevents, resolves them to maps, maps to exstrs, executes exstrs */
function* ParserController() {
    const parsers: {
        [mode_name in ModeName]: (keys: MinimalKey[]) => ParserResponse
    } = {
        normal: keys => generic.parser("nmaps", keys),
        insert: keys => generic.parser("imaps", keys, false),
        input: keys => generic.parser("inputmaps", keys, false),
        ignore: keys => generic.parser("ignoremaps", keys, false),
        hint: hinting.parser,
        gobble: gobblemode.parser,
        visual: keys => generic.parser("vmaps", keys),
        nmode: nmode.parser,
    }

    while (true) {
        let exstr = ""
        let previousSuffix = null
        let keyEvents: MinimalKey[] = []
        try {
            while (true) {
                generatorIsWaiting = true
                const keyevent: KeyEventLike = keysToFeed.length
                    ? keysToFeed.shift()
                    : yield
                generatorIsWaiting = false

                if (
                    !(keyevent instanceof MinimalKey) &&
                    !isTrustedKeyboardEvent(keyevent)
                ) {
                    logger.warning("Skipped spoofed key event", keyevent)
                    continue
                }

                // Don't break old modes with keyup events
                // TODO: fix this in these parsers directly
                if (
                    ["hint", "gobble"].includes(contentState.mode) &&
                    (!(keyevent instanceof MinimalKey)
                        ? keyevent.type === "keyup"
                        : keyevent.keyup)
                )
                    continue
                let textEditable = false

                if (!(keyevent instanceof MinimalKey)) {
                    const deepTarget = activeElement(keyevent.target as HTMLElement) || keyevent.target as HTMLElement
                    textEditable = isTextEditable(deepTarget)

                    // Accumulate key events. The parser will cut this
                    // down whenever it's not a valid prefix of a known
                    // binding, so it can't grow indefinitely unless you
                    // have a combination of maps that permits bindings of
                    // unbounded length.
                    keyEvents.push(minimalKeyFromKeyboardEvent(keyevent))
                } else {
                    keyEvents.push(keyevent)
                }

                // _just to be safe_, cache this to make the following
                // code more thread-safe.
                const currentMode = contentState.mode

                // This code was sort of the cause of the most serious bug in Tridactyl
                // to date (March 2018).
                // https://github.com/tridactyl/tridactyl/issues/311
                if (
                    currentMode !== "nmode" &&
                    currentMode !== "ignore" &&
                    currentMode !== "hint" &&
                    currentMode !== "input"
                ) {
                    if (textEditable) {
                        if (currentMode !== "insert") {
                            contentState.mode = "insert"
                        }
                    } else if (currentMode === "insert") {
                        contentState.mode = "normal"
                    }
                } else if (currentMode === "input" && !textEditable) {
                    contentState.mode = "normal"
                }

                const newMode = contentState.mode
                if (newMode !== currentMode) {
                    keyEvents = keyEvents.slice(-1)
                    previousSuffix = null
                }

                const response = (
                    parsers[contentState.mode] ||
                    (keys => generic.parser(contentState.mode + "maps", keys))
                )(keyEvents)
                logger.debug(
                    currentMode,
                    contentState.mode,
                    keyEvents,
                    response,
                )

                if (response.isMatch && !(keyevent instanceof MinimalKey)) {
                    canceller.push(keyevent)
                }

                if (response.exstr) {
                    exstr = response.exstr
                    break
                } else {
                    keyEvents = response.keys
                    // show current keyEvents as a suffix of the contentState
                    const suffix = formatKeysForModeIndicator(
                        keyEvents,
                        mapstrsForMode(contentState.mode),
                    )
                    if (previousSuffix !== suffix) {
                        contentState.suffix = suffix
                        previousSuffix = suffix
                    }
                    logger.debug("suffix: ", suffix)
                }
            }
            contentState.suffix = ""
            controller.acceptExCmd(exstr, "content")
        } catch (e) {
            // Rumsfeldian errors are caught here
            logger.error("An error occurred in the content controller: ", e)
        }
    }
}

export const generator = ParserController() // var rather than let stops weirdness in repl.
generator.next()

export function startBufferingPageKeys() {
    logger.debug("Starting buffering of page keys")
    bufferingPageKeysBeginTime = performance.now()
    mustBufferPageKeysForClInput = true
    bufferedPageKeys = []
}

export function keyMuncher(...keys: KeyEventLike[]) {
    if (keys.length === 0) return
    if (generatorIsWaiting) {
        keysToFeed = keysToFeed.concat(keys)
        generator.next(keysToFeed.shift())
    } else {
        keysToFeed = keysToFeed.concat(keys)
    }
}

/** Feed keys to the ParserController, unless they should be buffered to be later fed to clInput */
export function acceptKey(keyevent: TrustedKeyboardEvent) {
    function tryBufferingPageKeyForClInput(keyevent: TrustedKeyboardEvent) {
        if (!mustBufferPageKeysForClInput) return false
        const key = minimalKeyFromKeyboardEvent(keyevent)
        if (
            keyevent.type === "keydown" &&
            (keyevent.key === "Escape" || key.toMapstr() === "<C-[>")
        ) {
            mustBufferPageKeysForClInput = false
            bufferedPageKeys = []
            return false
        }
        const bufferingDuration = performance.now() - bufferingPageKeysBeginTime
        logger.debug(
            "controller_content mustBufferPageKeysForClInput = " +
                mustBufferPageKeysForClInput +
                " bufferingDuration = " +
                bufferingDuration +
                "ms",
        )
        const isCharacterKey =
            keyevent.type === "keydown" &&
            keyevent.key.length == 1 &&
            !keyevent.metaKey &&
            !keyevent.ctrlKey &&
            !keyevent.altKey &&
            !keyevent.metaKey
        if (isCharacterKey) {
            bufferedPageKeys.push(keyevent.key)
            logger.debug("Buffering page keys", bufferedPageKeys)
        }
        canceller.push(keyevent)
        return true
    }
    if (!tryBufferingPageKeyForClInput(keyevent))
        return generator.next(keyevent)
}

export function acceptTrustedKey(
    keyevent: Event,
    accept: (keyevent: TrustedKeyboardEvent) => unknown = acceptKey,
) {
    if (!isTrustedKeyboardEvent(keyevent)) return
    return accept(keyevent)
}

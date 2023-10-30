import { isTextEditable } from "@src/lib/dom"
import { contentState, ModeName } from "@src/content/state_content"
import Logger from "@src/lib/logging"
import * as controller from "@src/lib/controller"
import {
    KeyEventLike,
    ParserResponse,
    minimalKeyFromKeyboardEvent,
    MinimalKey,
} from "@src/lib/keyseq"
import { deepestShadowRoot } from "@src/lib/dom"

import * as hinting from "@src/content/hinting"
import * as gobblemode from "@src/parsers/gobblemode"
import * as generic from "@src/parsers/genericmode"
import * as nmode from "@src/parsers/nmode"
import * as Messaging from "@src/lib/messaging";

const logger = new Logger("controller")

function PrintableKey(k) {
    let result = k.key
    if (
        result === "Control" ||
        result === "Meta" ||
        result === "Alt" ||
        result === "Shift" ||
        result === "OS"
    ) {
        return ""
    }

    if (k.altKey) {
        result = "A-" + result
    }
    if (k.ctrlKey) {
        result = "C-" + result
    }
    if (k.shiftKey) {
        result = "S-" + result
    }
    if (result.length > 1) {
        result = "<" + result + ">"
    }
    return result
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
    private keyPress: KeyboardEvent[] = []
    private keyUp: KeyboardEvent[] = []

    constructor() {
        this.cancelKeyUp = this.cancelKeyUp.bind(this)
        this.cancelKeyPress = this.cancelKeyPress.bind(this)
    }

    push(ke: KeyboardEvent) {
        ke.preventDefault()
        ke.stopImmediatePropagation()
        this.keyPress.push(ke)
        this.keyUp.push(ke)
    }

    public cancelKeyPress = (ke: KeyboardEvent) => {
        if (!ke.isTrusted) return
        this.cancelKey(ke, this.keyPress)
    }

    public cancelKeyUp = (ke: KeyboardEvent) => {
        if (!ke.isTrusted) return
        this.cancelKey(ke, this.keyUp)
    }

    private cancelKey(ke: KeyboardEvent, kes: KeyboardEvent[]) {
        const index = kes.findIndex(
            ke2 =>
                ke.altKey === ke2.altKey &&
                ke.code === ke2.code &&
                ke.composed === ke2.composed &&
                ke.ctrlKey === ke2.ctrlKey &&
                ke.metaKey === ke2.metaKey &&
                ke.shiftKey === ke2.shiftKey &&
                ke.target === ke2.target,
        )
        if (index >= 0 && ke instanceof KeyboardEvent) {
            ke.preventDefault()
            ke.stopImmediatePropagation()
            kes.splice(index, 1)
        }
    }
}

export const canceller = new KeyCanceller()

let mustBufferPageKeysForClInput = false
let bufferedPageKeys: string[] = []
let bufferingPageKeysBeginTime: number
Messaging.addListener("buffered_page_keys", (message, sender, sendResponse) => {
    const bufferingDuration = performance.now() - bufferingPageKeysBeginTime;
    logger.debug("buffered_page_keys request received, responding with", bufferedPageKeys
        + " bufferingDuration = " + bufferingDuration + "ms")
    sendResponse(Promise.resolve(bufferedPageKeys))
    // At this point, clInput is focused and the page cannot get any more keyboard events
    // until it is refocused.
    mustBufferPageKeysForClInput = false
    bufferedPageKeys = []
})

/** Accepts keyevents, resolves them to maps, maps to exstrs, executes exstrs */
function* ParserController() {
    const parsers: {
        [mode_name in ModeName]: (keys: MinimalKey[]) => ParserResponse
    } = {
        normal: keys => generic.parser("nmaps", keys),
        insert: keys => generic.parser("imaps", keys),
        input: keys => generic.parser("inputmaps", keys),
        ignore: keys => generic.parser("ignoremaps", keys),
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
                const keyevent: KeyEventLike = yield
                let shadowRoot = null
                let textEditable = false

                if (keyevent instanceof KeyboardEvent) {
                    shadowRoot = deepestShadowRoot(
                        (keyevent.target as Element).shadowRoot,
                    )

                    textEditable =
                        shadowRoot === null
                            ? isTextEditable(keyevent.target as Element)
                            : isTextEditable(shadowRoot.activeElement)
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

                if (response.isMatch && keyevent instanceof KeyboardEvent) {
                    canceller.push(keyevent)
                }

                if (response.exstr) {
                    exstr = response.exstr
                    if (exstr.startsWith("fillcmdline")) { // TODO That's ugly. I need a way to know if this command is going to open the command line. Is there a better way?
                        logger.debug("Starting buffering of page keys")
                        bufferingPageKeysBeginTime = performance.now()
                        mustBufferPageKeysForClInput = true
                        bufferedPageKeys = []
                    }
                    break
                } else {
                    keyEvents = response.keys
                    // show current keyEvents as a suffix of the contentState
                    const suffix = keyEvents.map(x => PrintableKey(x)).join("")
                    if (previousSuffix !== suffix) {
                        contentState.suffix = suffix
                        previousSuffix = suffix
                    }
                    logger.debug("suffix: ", suffix)
                }
            }
            contentState.suffix = ""
            controller.acceptExCmd(exstr)
        } catch (e) {
            // Rumsfeldian errors are caught here
            logger.error("An error occurred in the content controller: ", e)
        }
    }
}

export const generator = ParserController() // var rather than let stops weirdness in repl.
generator.next()

/** Feed keys to the ParserController, unless they should be buffered to be later fed to clInput */
export function acceptKey(keyevent: KeyboardEvent) {
    function tryBufferingPageKeyForClInput(keyevent: KeyboardEvent) {
        if (!mustBufferPageKeysForClInput)
            return false;
        const bufferingDuration = performance.now() - bufferingPageKeysBeginTime;
        logger.debug("controller_content mustBufferPageKeysForClInput = " + mustBufferPageKeysForClInput
            + " bufferingDuration = " + bufferingDuration + "ms");
        // Stop buffering keys after 5s if something goes wrong and clInput never gets focused.
        if (bufferingDuration > 5000) {
            logger.debug("Aborting buffering of page keys since clInput still has not been focused")
            mustBufferPageKeysForClInput = false
            return false
        }
        const isCharacterKey = keyevent.key.length == 1
            && !keyevent.metaKey && !keyevent.ctrlKey && !keyevent.altKey && !keyevent.metaKey;
        if (isCharacterKey) {
            bufferedPageKeys.push(keyevent.key);
            logger.debug("Buffering page keys", bufferedPageKeys)
        }
        canceller.push(keyevent)
        return true
    }
    if (!tryBufferingPageKeyForClInput(keyevent))
        return generator.next(keyevent)
}

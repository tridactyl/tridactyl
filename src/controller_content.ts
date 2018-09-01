import { MsgSafeKeyboardEvent, MsgSafeNode, KeyboardEvent } from "./msgsafe"
import { isTextEditable } from "./dom"
import { contentState, ModeName } from "./state_content"
import { repeat } from "./.excmds_background.generated"
import Logger from "./logging"
import * as messaging from "./messaging"

import { parser as exmode_parser } from "./parsers/exmode"
import { parser as hintmode_parser } from "./hinting_background"
import { parser as findmode_parser } from "./finding_background"
import * as gobblemode from "./parsers/gobblemode"
import * as generic from "./parsers/genericmode"

const logger = new Logger("controller")


/** Accepts keyevents, resolves them to maps, maps to exstrs, executes exstrs */
function* ParserController() {
    const parsers: { [mode_name in ModeName]: any } = {
        normal: keys => generic.parser("nmaps", keys),
        insert: keys => generic.parser("imaps", keys),
        input: keys => generic.parser("inputmaps", keys),
        ignore: keys => generic.parser("ignoremaps", keys),
        hint: hintmode_parser,
        find: findmode_parser,
        gobble: gobblemode.parser,
    }

    while (true) {
        let exstr = ""
        let keyEvents: KeyboardEvent[] = []
        try {
            while (true) {
                let keyevent_raw: KeyboardEvent = yield
                let keyevent_safe: MsgSafeKeyboardEvent = KeyboardEvent(keyevent_raw)

                // _just to be safe_, cache this to make the following
                // code more thread-safe.
                let currentMode = contentState.mode
                let textEditable = isTextEditable(keyevent_safe.target)

                // This code was sort of the cause of the most serious bug in Tridactyl
                // to date (March 2018).
                // https://github.com/cmcaine/tridactyl/issues/311
                if (
                    currentMode !== "ignore" &&
                    currentMode !== "hint" &&
                    currentMode !== "input" &&
                    currentMode !== "find"
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
                logger.debug(keyevent_safe, contentState.mode)

                // Accumulate key events. The parser will cut this
                // down whenever it's not a valid prefix of a known
                // binding, so it can't grow indefinitely unless you
                // have a combination of maps that permits bindings of
                // unbounded length.
                keyEvents.push(keyevent_raw)

                let response = undefined
                response = (parsers[contentState.mode] as any)(keyEvents)
                logger.debug(keyEvents, response)

                if (response.isMatch) {
                    keyevent_raw.preventDefault()
                    keyevent_raw.stopImmediatePropagation()
                }

                if (response.exstr) {
                    exstr = response.exstr
                    break
                } else {
                    keyEvents = response.keys
                }
            }
            acceptExCmd(exstr)
        } catch (e) {
            // Rumsfeldian errors are caught here
            logger.error(
                "An error occurred in the content controller: ",
                e,
                " ¯\\_(ツ)_/¯"
            )
        }
    }
}

let generator = ParserController() // var rather than let stops weirdness in repl.
generator.next()

/** Feed keys to the ParserController */
export function acceptKey(keyevent: KeyboardEvent) {
    return generator.next(keyevent)
}

/** Parse and execute ExCmds */
export async function acceptExCmd(exstr: string): Promise<any> {
    messaging.message("controller_background", "acceptExCmd", [exstr])
}

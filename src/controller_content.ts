import { isTextEditable } from "./dom"
import { contentState, ModeName } from "./state_content"
import Logger from "./logging"
import * as excmds from "./.excmds_content.generated"
import * as controller from "./controller"

import * as hinting from "./hinting"
import * as finding from "./finding"
import * as gobblemode from "./parsers/gobblemode"
import * as generic from "./parsers/genericmode"

const logger = new Logger("controller")

controller.setExCmds(excmds)

/** Accepts keyevents, resolves them to maps, maps to exstrs, executes exstrs */
function* ParserController() {
    const parsers: { [mode_name in ModeName]: any } = {
        normal: keys => generic.parser("nmaps", keys),
        insert: keys => generic.parser("imaps", keys),
        input: keys => generic.parser("inputmaps", keys),
        ignore: keys => generic.parser("ignoremaps", keys),
        hint: hinting.parser,
        find: finding.parser,
        gobble: gobblemode.parser,
    }

    while (true) {
        let exstr = ""
        let keyEvents: KeyboardEvent[] = []
        try {
            while (true) {
                let keyevent: KeyboardEvent = yield

                // _just to be safe_, cache this to make the following
                // code more thread-safe.
                let currentMode = contentState.mode
                let textEditable = isTextEditable(keyevent.target as Element)

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

                // Accumulate key events. The parser will cut this
                // down whenever it's not a valid prefix of a known
                // binding, so it can't grow indefinitely unless you
                // have a combination of maps that permits bindings of
                // unbounded length.
                keyEvents.push(keyevent)

                let response = undefined
                response = (parsers[contentState.mode] as any)(keyEvents)
                logger.debug(
                    currentMode,
                    contentState.mode,
                    keyEvents,
                    response,
                )

                if (response.isMatch) {
                    keyevent.preventDefault()
                    keyevent.stopImmediatePropagation()
                }

                if (response.exstr) {
                    exstr = response.exstr
                    break
                } else {
                    keyEvents = response.keys
                }
            }
            controller.acceptExCmd(exstr)
        } catch (e) {
            // Rumsfeldian errors are caught here
            logger.error(
                "An error occurred in the content controller: ",
                e,
                " ¯\\_(ツ)_/¯",
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

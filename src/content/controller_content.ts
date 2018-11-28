import { isTextEditable } from "@src/lib/dom"
import { contentState, ModeName } from "@src/content/state_content"
import { repeat } from "@src/.excmds_background.generated"
import Logger from "@src/lib/logging"
import * as messaging from "@src/lib/messaging"

import { parser as exmode_parser } from "@src/parsers/exmode"
import * as hinting from "@src/content/hinting"
import * as finding from "@src/content/finding"
import * as gobblemode from "@src/parsers/gobblemode"
import * as generic from "@src/parsers/genericmode"

const logger = new Logger("controller")

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

		// show current keyEvents as a suffix of the contentState
		contentState.suffix = keyEvents.map(x => x.key).join('')

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
            acceptExCmd(exstr)
	    contentState.suffix = ''
        } catch (e) {
            // Rumsfeldian errors are caught here
            logger.error("An error occurred in the content controller: ", e)
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

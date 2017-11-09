import {MsgSafeKeyboardEvent, MsgSafeNode} from './msgsafe'
import {isTextEditable} from './dom'
import {parser as exmode_parser} from './parsers/exmode'
import state from "./state"

/** Accepts keyevents, resolves them to maps, maps to exstrs, executes exstrs */
function *ParserController () {
    while (true) {
        let ex_str = ""
        let keys = []
        try {
            while (true) { 
                let keyevent: MsgSafeKeyboardEvent = yield
                let keypress = keyevent.key

                // TODO: think about if this is robust
                if (isTextEditable(keyevent.target)) {
                    state.mode = "insert"
                } else if (state.mode === 'insert') {
                    state.mode = "normal"
                }
                console.log(keyevent, state.mode)

                // Special keys (e.g. Backspace) are not handled properly
                // yet. So drop them. This also drops all modifier keys.
                // When we put in handling for other special keys, remember
                // to continue to ban modifiers.
                if (keypress.length > 1 || keyevent.ctrlKey || keyevent.altKey) {
                    continue
                }

                keys.push(keypress)
                let response = state.modes[state.mode](keys)

                console.debug(keys, response)

                if (response.ex_str){
                    ex_str = response.ex_str
                    break
                } else {
                    keys = response.keys
                }
            }
            acceptExCmd(ex_str)
        } catch (e) {
            // Rumsfeldian errors are caught here
            console.error("Tridactyl ParserController fatally wounded:", e)
        }
    }
}

let generator = ParserController() // var rather than let stops weirdness in repl.
generator.next()

/** Feed keys to the ParserController */
export function acceptKey(keyevent: MsgSafeKeyboardEvent) {
    generator.next(keyevent)
}

/** Parse and execute ExCmds */
export function acceptExCmd(ex_str: string) {
    // TODO: Errors should go to CommandLine.
    try {
        let [func, args] = exmode_parser(ex_str)
        try {
            func(...args)
        } catch (e) {
            // Errors from func are caught here (e.g. no next tab)
            console.error(e)
        }
    } catch (e) {
        // Errors from parser caught here
        console.error(e)
    }
}

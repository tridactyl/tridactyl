interface Number {
    mod(n: number): number
}

/** Conventional definition of modulo that never gives a -ve result. */
Number.prototype.mod = function (n: number): number {
    return Math.abs(this % n)
}

namespace Controller {

    /** Accepts keyevents, resolves them to maps, maps to exstrs, executes exstrs */
    function *ParserController () {
        while (true) {
            let ex_str = ""
            let keys = []
            try {
                while (true) { 
                    let keyevent = yield
                    let keypress = keyevent.key

                    // Special keys (e.g. Backspace) are not handled properly
                    // yet. So drop them. This also drops all modifier keys.
                    // When we put in handling for other special keys, remember
                    // to continue to ban modifiers.
                    if (keypress.length > 1) {
                        continue
                    }

                    keys.push(keypress)
                    let response = Parsing.normalmode.parser(keys)

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
    export function acceptKey(keyevent: Event) {
        generator.next(keyevent)
    }

    /** Parse and execute ExCmds */
    export function acceptExCmd(ex_str: string) {
        let [func, args] = Parsing.exmode.parser(ex_str)

        try {
            func(...args)
        } catch (e) {
            // Errors from func are caught here (e.g. no next tab)
            // TODO: Errors should go to CommandLine.
            console.error(e)
        }
    }

    export function init() {
        // Send keys to controller
        keydown_background.onKeydown.addListener(acceptKey)
        // To eventually be replaced by:
        // browser.keyboard.onKeydown.addListener

        // Send commandline to controller
        CommandLine.onLine.addListener(acceptExCmd)
    }
}

Controller.init()

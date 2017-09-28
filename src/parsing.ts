// Simple implementations of a normal and ex mode parsers
namespace Parsing {

    // Tridactyl normal mode:
    //
    // differs from Vim in that no map may be a prefix of another map (e.g. 'g' and 'gg' cannot both be maps). This simplifies the parser.
    namespace normalmode {

        // Normal-mode mappings.
        // keystr -> ex_str
        // TODO: Move these into a tridactyl-wide state namespace
        const nmaps = new Map<string, string>([
            ["t", "tabopen"],
            ["j", "scrolldown"],
            ["k", "scrollup"],
            ["gt", "nextab"],
            ["gT", "prevtab"],
            ["gr", "reader"],
            [":", "exmode"],
            ["s", "open google"],
            ["xx", "something"],
            // Special keys must be prepended with 🄰
            // ["🄰Backspace", "something"],
        ])

        // Split a string into a number prefix and some following keys.
        function keys_split_count(keys: string[]){
            // Extracts the first number with capturing parentheses
            const FIRST_NUM_REGEX = /^([0-9]+)/

            let keystr = keys.join("")
            let regexCapture = FIRST_NUM_REGEX.exec(keystr)
            let count = regexCapture ? regexCapture[0] : null
            keystr = keystr.replace(FIRST_NUM_REGEX,"")
            return [count, keystr]
        }

        // Given a valid keymap, resolve it to an ex_str
        function resolve_map(map) {
            // TODO: This needs to become recursive to allow maps to be defined in terms of other maps.
            return nmaps.get(map)
        }

        // Valid keystr to ex_str by splitting count, resolving keystr and appending count as final argument.
        // TODO: This is a naive way to deal with counts and won't work for ExCmds that don't expect a numeric answer.
        // TODO: Refactor to return a ExCmdPartial object?
        function get_ex_str(keys): string {
            let [count, keystr] = keys_split_count(keys)
            let ex_str = resolve_map(keystr)
            if (ex_str){
                ex_str = count ? ex_str + " " + count : ex_str
            }
            return ex_str
        }

        // A list of maps that keys could potentially map to.
        function possible_maps(keys): string[] {
            let [count, keystr] = keys_split_count(keys)
            
            // Short circuit or search maps.
            if (nmaps.has(keystr)) {
                return [keystr,]
            } else {
                // Efficiency: this can be short-circuited.
                return completions(keystr)
            }
        }

        // A list of maps that start with the fragment.
        export function completions(fragment): string[] {
            let posskeystrs = Array.from(nmaps.keys())
            return posskeystrs.filter((key)=>key.startsWith(fragment))
        }

        interface NormalResponse {
            keys?: string[]
            ex_str?: string
        }

        export function parser(keys): NormalResponse {
            // If there aren't any possible matches, throw away keys until there are
            while ((possible_maps(keys).length == 0) && (keys.length)) {
                keys = keys.slice(1)
            }

            // If keys map to an ex_str, send it
            let ex_str = get_ex_str(keys)
            if (ex_str){
                return {ex_str}
            } 
            // Otherwise, return the keys that might be used in a future command
            return {keys}
        }
    }

    // Ex Mode (AKA cmd mode)
    namespace exmode {

        // ex_str function names
        // TODO: These should be automatically discovered with introspection of the ExCmd object.
        const ex_str_to_func = {
            tabopen:             console.log,
            scrolldown:          ExCmds.scrolldown,
            scrollup:            ExCmds.scrollup,
            scrolldownline:      ExCmds.scrolldownline,
            scrollupline:        ExCmds.scrollupline,
            scrolldownpage:      ExCmds.scrolldownpage,
            scrolluppage:        ExCmds.scrolluppage,
            scrolldownhalfpage:  ExCmds.scrolldownhalfpage,
            scrolluphalfpage:    ExCmds.scrolluphalfpage,
            nextab:              console.log,
            prevtab:             console.log,
            reader:              console.log,
            exmode:              console.log,
            open:                console.log,
            //something:           console.log,
        }

        // Simplistic Ex command line parser.
        // TODO: Quoting arguments
        // TODO: Pipe to separate commands
        export function parser(ex_str){
            let [func,...args] = ex_str.split(" ")
            return [ex_str_to_func[func], args]
        }
    }

    function *ParserController () {
        while (true) {
            let ex_str = ""
            let keys = []
            try {
                while (true) {

                    let keyevent = yield
                    let keypress = keyevent.key

                    // If the keypress is a special key, e.g. "Backspace"
                    // denote it as such by appending a special character that
                    // will never match a valid map.
                    keypress = (keypress.length > 1) ? "🄰" + keypress : keypress
                    keys.push(keypress)
                    let response = normalmode.parser(keys)

                    console.debug(keys, response)

                    if (response.ex_str){
                        ex_str = response.ex_str
                        break
                    } else {
                        keys = response.keys
                    }
                }
                
                let [func, args] = exmode.parser(ex_str)

                try {
                    func(...args)
                } catch (e) {
                    // Errors from func are caught here (e.g. no next tab)
                    console.error(e)
                }
            } catch (e) {
                // Rumsfeldian errors are caught here
                console.error("Tridactyl ParserController fatally wounded:", e)
            }
        }
    }

    let generator = ParserController() // var rather than let stops weirdness in repl.
    generator.next()

    // Feed keys to the controller.
    export function acceptKey(keyevent: Event) {
        generator.next(keyevent)
    }
}

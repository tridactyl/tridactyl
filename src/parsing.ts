import * as ExCmds from "./excmds_background"
import * as convert from "./convert"
import {enumerate, head, izip} from "./itertools"


// Simple implementations of a normal and ex mode parsers
export namespace insertmode  {
    // WIP
    const pmaps = new Map<string,string>([
        // Special keys must be prepended with 🄰
        ["🄰Escape", "normalmode"],
    ])


    // Placeholder - should be moved into generic parser
    export function parser(keys){
        return {keys: []}
    }
}


// Tridactyl normal mode:
//
// differs from Vim in that no map may be a prefix of another map (e.g. 'g' and 'gg' cannot both be maps). This simplifies the parser.
export namespace normalmode {

    // Normal-mode mappings.
    // keystr -> ex_str
    // TODO: Move these into a tridactyl-wide state namespace
    // TODO: stop stealing keys from "insert mode"
    //          r -> refresh page is particularly unhelpful
    const nmaps = new Map<string, string>([
        ["o", "fillcmdline open"],
        ["O", "current-url open"],
        ["w", "fillcmdline winopen"],
        ["W", "current-url winopen"],
        ["t", "tabopen"],
        //["t", "fillcmdline tabopen"], // for now, use mozilla completion
        ["]]", "clicknext"], 
        ["[[", "clicknext prev"], 
        ["T", "current-url tab"],
        ["yy", "clipboard yank"],
        ["p", "clipboard open"],
        ["P", "clipboard tabopen"],
        ["j", "scrollline 10"],
        ["k", "scrollline -10"],
        ["h", "scrollpx -50"],
        ["l", "scrollpx 50"],
        ["G", "scrollto 100"],
        ["gg", "scrollto 0"],
        ["H", "back"],
        ["L", "forward"],
        ["d", "tabclose"],
        ["u", "undo"],
        ["r", "reload"],
        ["R", "reloadhard"],
        ["gt", "tabnext"],
        ["gT", "tabprev"],
        ["gr", "reader"],
        [":", "fillcmdline"],
        ["s", "fillcmdline google"],
        ["xx", "something"],
        ["i", "insertmode"],
        ["b", "openbuffer"],
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

    export interface NormalResponse {
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
export namespace exmode {


    /* Converts numbers, boolean, string[].

       string[] eats all remaining arguments, so it should only be used as a
       type of the last arg.

       TODO: quoted strings
       TODO: shell style options
       TODO: counts
    */
    function convertArgs(params, argv) {
        const conversions = {
            number: convert.toNumber,
            boolean: convert.toBoolean,
            string: (s)=>s,
        }

        const typedArgs = []
        let type, arg, i
        for ([type, [i, arg]] of izip(params.values(), enumerate(argv))) {
            if (type in conversions) {
                typedArgs.push(conversions[type](arg))
            } else if (type.includes('|')) {
                // Do your own conversions!
                typedArgs.push(arg)
            } else if (type === "string[]") {
                // Eat all remaining arguments
                return [...typedArgs, ...argv.slice(i)]
            } else throw new TypeError(`Unknown type: ${type}`)
        }
        return typedArgs
    }

    // Simplistic Ex command line parser.
    // TODO: Quoting arguments
    // TODO: Pipe to separate commands
    // TODO: Abbreviated commands
    export function parser(ex_str){
        let [func,...args] = ex_str.split(" ")
        if (ExCmds.cmd_params.has(func)) {
            try {
                let typedArgs = convertArgs(ExCmds.cmd_params.get(func), args)
                console.log(ex_str, typedArgs)
                return [ExCmds[func], convertArgs(ExCmds.cmd_params.get(func), args)]
            } catch (e) {
                console.error("Error executing or parsing:", ex_str, e)
                throw e
            }
        } else {
            throw `Not an excmd: ${func}`
        }
    }
}

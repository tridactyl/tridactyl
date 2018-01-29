/** Ex Mode (AKA cmd mode) */

import * as ExCmds from "../excmds_background"
import * as convert from "../convert"
import * as Config from "../config"
import * as aliases from "../aliases"
import {enumerate, head, izip} from "../itertools"

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
        string: s=>s,
        ModeName: s=>s,
    }

    const typedArgs = []
    let type, arg, i
    for ([type, [i, arg]] of izip(params.values(), enumerate(argv))) {
        if (type in conversions) {
            typedArgs.push(conversions[type](arg))
        } else if (type.includes('|') || ["'", '"'].includes(type[0])) {
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
export function parser(ex_str: string): any[] {
    // Expand aliases
    const expandedExstr = aliases.expandExstr(ex_str)
    const [func,...args] = expandedExstr.trim().split(/\s+/)

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

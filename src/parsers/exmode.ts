/** Ex Mode (AKA cmd mode) */

import * as convert from "@src/lib/convert"
import * as aliases from "@src/lib/aliases"
import * as Logging from "@src/lib/logging"
import { enumerate, izip } from "@src/lib/itertools"

const logger = new Logging.Logger("exmode")

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
        string: s => s,
        ModeName: s => s,
    }

    const typedArgs = []
    let type
    let arg
    let i
    for ([type, [i, arg]] of izip(params.values(), enumerate(argv))) {
        if (type in conversions) {
            typedArgs.push(conversions[type](arg))
        } else if (type.includes("|") || ["'", '"'].includes(type[0])) {
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
export function parser(exstr: string, all_excmds: any): any[] {
    // Expand aliases
    const expandedExstr = aliases.expandExstr(exstr)
    const [func, ...args] = expandedExstr.trim().split(/\s+/)

    // Try to find which namespace (ex, text, ...) the command is in
    const dotIndex = func.indexOf(".")
    const namespce = func.substring(0, dotIndex)
    const funcName = func.substring(dotIndex + 1)
    const excmds = all_excmds[namespce]

    if (excmds === undefined) {
        throw new Error(`Unknwown namespace: ${namespce}.`);
    }

    // Convert arguments
    let converted_args
    if (excmds.cmd_params !== undefined && excmds.cmd_params.has(func)) {
        try {
            converted_args = convertArgs(excmds.cmd_params.get(func), args)
        } catch (e) {
            logger.error("Error executing or parsing:", exstr, e)
            throw e
        }
    } else {
        converted_args = args
    }

    if (excmds[funcName] === undefined) {
        logger.error("Not an excmd:", exstr)
        throw `Not an excmd: ${func}`
    }

    return [excmds[funcName], converted_args]
}

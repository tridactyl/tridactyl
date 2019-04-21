/** Ex Mode (AKA cmd mode) */

import { CmdlineCmds } from "@src/background/commandline_cmds"
import { EditorCmds } from "@src/background/editor"
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
export function parser(exstr: string, excmds: any): any[] {
    // Expand aliases
    const expandedExstr = aliases.expandExstr(exstr)
    const [func, ...args] = expandedExstr.trim().split(/\s+/)

    if (excmds.cmd_params.has(func)) {
        try {
            return [
                excmds[func],
                convertArgs(excmds.cmd_params.get(func), args),
            ]
        } catch (e) {
            logger.error("Error executing or parsing:", exstr, e)
            throw e
        }
    } else {
        const match = func.match("^\([^.]+\)\.\(.*\)")
        if (match !== undefined) {
            const [namespce, name] = match.slice(1)
            const funcs = ({
                "text": EditorCmds,
                "ex": CmdlineCmds,
            })[namespce]
            if (funcs !== undefined) {
                return [funcs[name] , args]
            }
        }
        logger.error("Not an excmd:", exstr)
        throw `Not an excmd: ${func}`
    }
}

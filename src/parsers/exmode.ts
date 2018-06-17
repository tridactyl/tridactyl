/** Ex Mode (AKA cmd mode) */

import * as ExCmds from "../.excmds_background.generated"
import * as convert from "../convert"
import * as Config from "../config"
import * as aliases from "../aliases"
import * as Logging from "../logging"
import { enumerate, head, izip } from "../itertools"
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
    let type, arg, i
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
export function parser(exstr: string): any[] {
    // Expand aliases
    const [command, ...args] = aliases.expandExarr(exstr)

    if (ExCmds.cmd_params.has(command)) {
        try {
            return [
                ExCmds[command],
                convertArgs(ExCmds.cmd_params.get(command), args),
            ]
        } catch (e) {
            logger.error("Error executing or parsing:", exstr, e)
            throw e
        }
    } else {
        logger.error("Not an excmd:", exstr)
        throw `Not an excmd: ${command}`
    }
}

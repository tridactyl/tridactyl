/** Ex Mode (AKA cmd mode) */

import * as ExCmds from "@src/.excmds_background.generated"
import * as convert from "@src/lib/convert"
import * as Config from "@src/lib/config"
import * as aliases from "@src/lib/aliases"
import * as Logging from "@src/lib/logging"
import { enumerate, head, izip } from "@src/lib/itertools"
import { exmodeScanner } from "@src/parsers/lex_grammar"
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
    const expandedExstr = aliases.expandExstr(exstr)
    const [excmd, ...rest] = exmodeScanner(expandedExstr)
    const func = excmd.raw_in
    const args = rest.map(x => x.processed)

    if (ExCmds.cmd_params.has(func)) {
        try {
            return [ExCmds[func], args]
        } catch (e) {
            logger.error("Error executing or parsing:", exstr, e)
            throw e
        }
    } else {
        logger.error("Not an excmd:", exstr)
        throw `Not an excmd: ${func}`
    }
}

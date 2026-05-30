/** Ex Mode (AKA cmd mode) */

import { excmdsFunctions, paramTypes, convert } from "@src/.metadata.generated"
import * as aliases from "@src/lib/aliases"
import * as Logging from "@src/lib/logging"

const logger = new Logging.Logger("exmode")

function convertArgs(params, argv) {
    const typedArgs = []
    for (let i = 0, j = 0; i < params.length && j < argv.length; ++i && ++j) {
        const p = params[i]
        // Special casing arrays because that's why the previous arg conversion code did
        if (p.flags?.isRest || p.type?.type === "array") {
            return typedArgs.concat(convert(p.type, argv.slice(j)))
        }
        typedArgs.push(convert(p.type, argv[j]))
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
        throw new Error(`Unknown namespace: ${namespce}.`)
    }

    // Convert arguments, but only for ex commands
    let converted_args
    if (namespce == "" && args.length > 0) {
        const fn = excmdsFunctions[funcName]
        if (!fn) {
            // user defined functions?
            converted_args = args
        } else {
            try {
                converted_args = convertArgs(paramTypes(fn), args)
            } catch (e) {
                logger.error("Error executing or parsing:", exstr, e)
                throw e
            }
        }
    } else {
        converted_args = args
    }

    if (excmds[funcName] === undefined) {
        logger.error("Not an excmd:", exstr)
        throw new Error(`Not an excmd: ${func}`)
    }

    return [excmds[funcName], converted_args]
}

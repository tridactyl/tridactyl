/** Ex Mode (AKA cmd mode) */

import { FunctionType } from "../../compiler/types/AllTypes"
import { everything as metadata } from "../.metadata.generated"
import * as aliases from "../lib/aliases"
import * as Logging from "../lib/logging"

const logger = new Logging.Logger("exmode")

function convertArgs(types, argv) {
    const typedArgs = []
    for (
        let itypes = 0, iargv = 0;
        itypes < types.length && iargv < argv.length;
        ++itypes && ++iargv
    ) {
        const curType = types[itypes]
        const curArg = argv[iargv]
        // Special casing arrays because that's why the previous arg conversion code did
        if (curType.isDotDotDot || curType.kind === "array") {
            return typedArgs.concat(curType.convert(argv.slice(iargv)))
        }
        typedArgs.push(curType.convert(curArg))
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
        let types
        try {
            types = (metadata.getFile("src/excmds.ts").getFunction(funcName)
                .type as FunctionType).args
        } catch (e) {
            // user defined functions?
            types = null
            converted_args = args
        }
        if (types !== null) {
            try {
                converted_args = convertArgs(types, args)
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

/** Ex Mode (AKA cmd mode) */

import { excmdsFunctions, paramTypes, convert } from "@src/.metadata.generated"
import * as aliases from "@src/lib/aliases"
import * as config from "@src/lib/config"
import * as Logging from "@src/lib/logging"
import { selector } from "@src/lib/collections"
import { stripLeadingColons } from "@src/lib/excmd"

const logger = new Logging.Logger("exmode")

interface PipelineInput {
    piped: boolean
    value: any
}

class BoundArgument {
    constructor(public value: any) {}
}

const isInputReference = (argument: string) =>
    argument.startsWith("=.") || argument.startsWith("=[")

function bindInput(args: string[], input?: PipelineInput) {
    if (!input) return [args, false]
    let consumed = false
    const bound = args.map(argument => {
        if (argument.startsWith("\\") && isInputReference(argument.slice(1)))
            return argument.slice(1)
        if (!isInputReference(argument)) return argument
        if (!input.piped)
            throw new Error(
                `Pipeline input reference ${argument} used without pipeline input`,
            )
        consumed = true
        return new BoundArgument(selector(`_${argument.slice(1)}`)(input.value))
    })
    return [bound, consumed]
}

const convertArg = (type, argument) =>
    argument instanceof BoundArgument ? argument.value : convert(type, argument)

function convertArgs(params, argv) {
    const typedArgs = []
    for (let i = 0, j = 0; i < params.length && j < argv.length; ++i && ++j) {
        const p = params[i]
        // Special casing arrays because that's why the previous arg conversion code did
        if (p.flags?.isRest || p.type?.type === "array") {
            if (argv.slice(j).some(arg => arg instanceof BoundArgument))
                return typedArgs.concat(
                    argv
                        .slice(j)
                        .map(arg =>
                            convertArg(p.type?.elementType || p.type, arg),
                        ),
                )
            return typedArgs.concat(convert(p.type, argv.slice(j)))
        }
        typedArgs.push(convertArg(p.type, argv[j]))
    }
    return typedArgs.concat(
        argv
            .slice(params.length)
            .filter(arg => arg instanceof BoundArgument)
            .map(arg => arg.value),
    )
}

// Simplistic Ex command line parser.
// TODO: Quoting arguments
// TODO: Pipe to separate commands
export function parser(
    exstr: string,
    all_excmds: any,
    input?: PipelineInput,
): any[] {
    const exaliases = config.get("exaliases")
    const normalizedExstr = stripLeadingColons(exstr)
    const [unexpandedFunc] = normalizedExstr.trim().split(/\s+/)
    const builtinExcmds = all_excmds[""] || {}
    let expandedExstr = normalizedExstr

    if (
        unexpandedFunc &&
        !unexpandedFunc.includes(".") &&
        exaliases[unexpandedFunc] === undefined &&
        builtinExcmds[unexpandedFunc] === undefined
    ) {
        const matches = Object.keys({ ...excmdsFunctions, ...exaliases })
            .filter(
                name =>
                    name.startsWith(unexpandedFunc) &&
                    (exaliases[name] !== undefined ||
                        builtinExcmds[name] !== undefined),
            )
            .sort()
        if (matches.length > 1)
            throw new Error(
                `Ambiguous excmd: ${unexpandedFunc}. Possible matches: ${matches.join(", ")}`,
            )
        if (matches.length === 1)
            expandedExstr = normalizedExstr.replace(
                unexpandedFunc,
                matches[0],
            )
    }

    // Expand aliases
    expandedExstr = aliases.expandExstr(expandedExstr, exaliases)
    const [func, ...rawArgs] = expandedExstr.trim().split(/\s+/)
    const [args, consumed] = bindInput(rawArgs, input) as [any[], boolean]

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

    return [
        excmds[funcName],
        converted_args.map(arg =>
            arg instanceof BoundArgument ? arg.value : arg,
        ),
        consumed,
    ]
}

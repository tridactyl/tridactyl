/** Ex Mode (AKA cmd mode) */

import { excmdsFunctions, paramTypes, convert } from "@src/.metadata.generated"
import * as aliases from "@src/lib/aliases"
import * as Logging from "@src/lib/logging"
import { ExExpression, expression, isExpression } from "@src/lib/collections"
import { stripLeadingColons } from "@src/lib/excmd"

const logger = new Logging.Logger("exmode")

interface PipelineInput {
    piped: boolean
    value: any
}

class BoundArgument {
    constructor(public value: any) {}
}

class ExpressionArgument {
    constructor(
        public source: string,
        public callback: ExExpression,
    ) {}
}

const operator = /^(?:==|!=|>=|<=|>|<|&&|\|\|)$/

function startsExpression(args: string[], start: number) {
    if (isExpression(args[start])) return true
    if (!args[start].startsWith("(")) return false
    let depth = 0
    let quote = ""
    let continued = false
    for (let end = start; end < args.length; end++) {
        for (let index = 0; index < args[end].length; index++) {
            const character = args[end][index]
            if (quote) {
                if (character === "\\") index++
                else if (character === quote) quote = ""
            } else if (character === "'" || character === '"') quote = character
            else if (character === "(") depth++
            else if (character === ")") depth--
        }
        if (depth === 0) {
            if (isExpression(args.slice(start, end + 1).join(" "))) return true
            if (operator.test(args[end]) || operator.test(args[end + 1] || "")) {
                continued = true
                continue
            }
            return continued && isExpression(args.slice(start).join(" "))
        }
    }
    return isExpression(args.slice(start).join(" "))
}

function expressionArguments(args: string[]) {
    const parsed: (string | ExpressionArgument)[] = []
    for (let start = 0; start < args.length; start++) {
        const argument = args[start]
        if (argument.startsWith("\\") && isExpression(argument.slice(1))) {
            parsed.push(argument.slice(1))
            continue
        }
        if (!startsExpression(args, start)) {
            parsed.push(argument)
            continue
        }

        let found: ExpressionArgument | undefined
        let failure: unknown
        let end = args.length
        for (; end > start; end--) {
            const source = args.slice(start, end).join(" ")
            try {
                found = new ExpressionArgument(source, expression(source))
                break
            } catch (error) {
                failure ??= error
            }
        }
        if (!found) throw failure
        if (operator.test(args[end] || ""))
            throw new Error(
                `Invalid expression: ${args.slice(start, end + 1).join(" ")}`,
            )
        parsed.push(found)
        start = end - 1
    }
    return parsed
}

function isExpressionType(type): boolean {
    if (!type) return false
    if (type.type === "union") return type.types.some(isExpressionType)
    return type.type === "reference" && type.name === "ExExpression"
}

function parameterAt(params, index: number) {
    if (params[index]) return params[index]
    const last = params[params.length - 1]
    return last?.flags?.isRest ? last : undefined
}

function bindInput(args, params, input?: PipelineInput) {
    let consumed = false
    const bound = args.map((argument, index) => {
        if (!(argument instanceof ExpressionArgument)) return argument
        if (isExpressionType(parameterAt(params, index)?.type))
            return new BoundArgument(argument.callback)
        if (!input) return argument.source
        if (!input.piped)
            throw new Error(
                `Input expression ${argument.source} used without pipeline input`,
            )
        consumed = true
        return new BoundArgument(argument.callback(input.value))
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
// TODO: Abbreviated commands
export function parser(
    exstr: string,
    all_excmds: any,
    input?: PipelineInput,
): any[] {
    const normalizedExstr = stripLeadingColons(exstr)
    // Expand aliases
    const expandedExstr = aliases.expandExstr(normalizedExstr)
    if (input && isExpression(expandedExstr)) {
        const callback = expression(expandedExstr)
        if (!input.piped)
            throw new Error(
                `Input expression ${expandedExstr} used without pipeline input`,
            )
        return [callback, [input.value], true]
    }

    const [func, ...rawArgs] = expandedExstr.trim().split(/\s+/)

    // Try to find which namespace (ex, text, ...) the command is in
    const dotIndex = func.indexOf(".")
    const namespce = func.substring(0, dotIndex)
    const funcName = func.substring(dotIndex + 1)
    const excmds = all_excmds[namespce]

    if (excmds === undefined) {
        throw new Error(`Unknown namespace: ${namespce}.`)
    }

    const fn = namespce == "" ? excmdsFunctions[funcName] : undefined
    const params = paramTypes(fn)
    const parsedArgs =
        input || params.some(param => isExpressionType(param.type))
            ? expressionArguments(rawArgs)
            : rawArgs
    const [args, consumed] = bindInput(parsedArgs, params, input) as [
        any[],
        boolean,
    ]

    // Convert arguments, but only for ex commands
    let converted_args
    if (namespce == "" && args.length > 0) {
        if (!fn) {
            // user defined functions?
            converted_args = args
        } else {
            try {
                converted_args = convertArgs(params, args)
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

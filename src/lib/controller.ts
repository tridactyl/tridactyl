import Logger from "@src/lib/logging"
import { parser2020 } from "@src/parsers/exmode2020"
import * as State from "@src/state"
import state from "@src/state"
import { FunctionType } from "../../compiler/types/AllTypes"
import { everything as metadata } from "@src/.metadata.generated"

import { Parser, ExpressionEval } from "excmd"

type eximpl<Ret> = (this: void, ...args: unknown[]) => Ret
type exhandler<Ret> = (this: void, f: eximpl<Ret>, expr: ExpressionEval) => Ret

const logger = new Logger("controller")

const excmds_metadata = metadata.getFile("src/excmds.ts")

let stored_excmds: any
export function setExCmds(excmds: any) {
    stored_excmds = excmds
}

/** Parse and execute ExCmds */
export async function acceptExCmd2020(exstr: string): Promise<any> {
    // TODO: Errors should go to CommandLine.
    try {
        const [func, args] = parser2020(exstr, stored_excmds)
        // Stop the repeat excmd from recursing and don't store private window commands
        if (
            func !== stored_excmds[""].repeat &&
            exstr.search("winopen -private") < 0
        ) {
            State.getAsync("last_ex_str").then(last_ex_str => {
                if (last_ex_str != exstr) state.last_ex_str = exstr
            })
        }
        try {
            return await func(...args)
        } catch (e) {
            // Errors from func are caught here (e.g. no next tab)
            logger.error("controller in excmd: ", e)
        }
    } catch (e) {
        // Errors from parser caught here
        logger.error("controller while accepting: ", e)
    }
}

export async function dispatchExmodeScript(exstr: string): Promise<number> {
    const scpt = Parser.scriptOfString(exstr)

    let last
    for (const expr of scpt.expressions)
        last = await dispatchExmodeExpr(
            expr.cloneWithEvaluator(dispatchExmodeExprAsString),
        )

    return last
}

async function dispatchExmodeExprAsString(
    excmd: ExpressionEval,
): Promise<string> {
    // NYI: uhhhh
    return String(await dispatchExmodeExpr(excmd))
}

/** Evaluate an ex-mode command, passed as an [[excmd.Expression]].
 *
 */
export async function dispatchExmodeExpr(expr: ExpressionEval) {
    const cmd = await expr.command

    // Try to find which namespace (ex, text, ...) the command is in
    const dotIndex = cmd.indexOf(".")
    const namespace = cmd.substring(0, dotIndex)
    const rawFuncName = cmd.substring(dotIndex + 1)

    // Note that due to the escaping of `$` *itself* in the second argument to JavaScript's
    // `replace()`, this is actually replacing a single dollar-sign with two dollar-signs.
    // See: <http://mdn.io/String.replace#specifying_a_string_as_a_parameter>
    const funcName = rawFuncName.replace(/\$/g, "$$$")

    const excmds = stored_excmds[namespace]
    if (excmds === undefined) {
        throw new Error(`Unknown namespace: ${namespace}.`)
    }

    const excmd: eximpl<unknown> | undefined = excmds[funcName]
    const handler: exhandler<unknown> | undefined = excmds["$" + funcName]

    // FIXME: Proper error(s), with location information
    if (excmd === undefined) {
        throw new Error(`Not an excmd: ${funcName}`)
    }

    if (handler === undefined) {
        logger.warning(`Missing runtime-conv function: $${funcName}`)

        // If there's no `$func` to accept an expr and handle argument-conversion, we fall back on
        // reducing *all* values to positionals and let the 2020 argument-handling code deal with
        // it.
        const positionals = await expr.getPositionals()

        // Convert arguments, but only for ex commands
        let converted_positionals
        if (namespace == "" && positionals.length > 0) {
            let types
            try {
                // FIXME: This should be handled properly at the type-level, instead of through an
                //        assertion
                types = (excmds_metadata.getFunction(funcName)
                    .type as FunctionType).args
            } catch (e) {
                // user defined functions?
                types = null
                converted_positionals = positionals
            }
            if (types !== null) {
                converted_positionals = convertArgs(types, positionals)
            }
        } else {
            converted_positionals = positionals
        }

        return excmd(...converted_positionals)
    } else {
        return handler(excmd, expr)
    }
}

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

import Logger from "@src/lib/logging"
import {
    ExCommand,
    ExProgram,
    isExProgram,
    programSource,
    stripLeadingColons,
} from "@src/lib/excmd"
import { evaluate } from "@src/parsers/exdsl"
import { parser as exmode_parser } from "@src/parsers/exmode"
import * as State from "@src/state"
import state from "@src/state"

const logger = new Logger("controller")

type ExCmdSource = "commandline" | "content"
let currentExCmdSource: ExCmdSource

let stored_excmds: any
export function setExCmds(excmds: any) {
    stored_excmds = excmds
}

export function getCurrentExCmdSource() {
    return currentExCmdSource
}

/** Parse and execute ExCmds */
export async function acceptExCmd(
    excmd: ExCommand,
    source?: ExCmdSource,
    exversion: "1" | "2" = "1",
): Promise<any> {
    const exstr = stripLeadingColons(programSource(excmd))
    if (!exstr.trim()) return
    const isV2 =
        isExProgram(excmd) || (source === "commandline" && exversion === "2")
    const recordedExcmd: ExCommand = isV2
        ? isExProgram(excmd)
            ? { ...excmd, source: exstr }
            : { source: exstr, exversion: 2 }
        : exstr
    const previousExCmdSource = currentExCmdSource
    currentExCmdSource = source || previousExCmdSource
    // TODO: Errors should go to CommandLine.
    try {
        let recorded = false
        const run = (
            command: string,
            piped = false,
            value?: any,
            program?: ExProgram,
            raw?: string,
        ) => {
            const [func, args, consumed] = exmode_parser(
                command,
                stored_excmds,
                isV2 ? { piped, value } : undefined,
            )
            // A heredoc is one literal argument, not text for the legacy parser.
            if (raw !== undefined) args.push(raw)
            if (
                program &&
                !["autocmd", "bind", "bindurl", "repeat"].some(
                    name => stored_excmds[""][name] === func,
                )
            )
                throw new Error(`${command} does not accept an ex block`)
            // Stop repeat from recursing and don't store private window commands.
            if (!recorded) {
                recorded = true
                if (
                    func !== stored_excmds[""].repeat &&
                    exstr.search("winopen -private") < 0
                )
                    State.getAsync("last_ex_str").then(last_ex_str => {
                        if (
                            programSource(last_ex_str) !== exstr ||
                            isExProgram(last_ex_str) !== isV2
                        )
                            state.last_ex_str = recordedExcmd
                    })
            }
            const commandArgs = program ? [...args, program] : args
            if (piped && !consumed) commandArgs.push(value)
            return func(...commandArgs)
        }

        if (isV2) return await evaluate(exstr, run)

        try {
            return await run(exstr)
        } catch (e) {
            // Errors from func are caught here (e.g. no next tab)
            logger.error("controller in excmd: ", e)
        }
    } catch (e) {
        // Errors from parser caught here
        logger.error("controller while accepting: ", e)
        if (isV2) throw e
    } finally {
        currentExCmdSource = previousExCmdSource
    }
}

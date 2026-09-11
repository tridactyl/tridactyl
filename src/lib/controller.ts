import Logger from "@src/lib/logging"
import * as config from "@src/lib/config"
import { parser as exmode_parser } from "@src/parsers/exmode"
import * as State from "@src/state"

const logger = new Logger("controller")

type ExCmdSource = "commandline" | "content"
let currentExCmdSource: ExCmdSource
let exCmdListener: () => void

export function setExCmdListener(listener: () => void) {
    exCmdListener = listener
}

let stored_excmds: any
export function setExCmds(excmds: any) {
    stored_excmds = excmds
}

export function getCurrentExCmdSource() {
    return currentExCmdSource
}

/** Resolve an ExCmd for direct invocation without changing repeat state. */
export function resolveExCmd(exstr: string) {
    const [func, args] = exmode_parser(exstr, stored_excmds)
    return async (...extraArgs: any[]) => {
        try {
            return await func(...args, ...extraArgs)
        } catch (e) {
            logger.error("controller in excmd: ", e)
        }
    }
}

/** Parse and execute ExCmds */
export async function acceptExCmd(exstr: string, source?: ExCmdSource): Promise<any> {
    const previousExCmdSource = currentExCmdSource
    currentExCmdSource = source || previousExCmdSource
    let lastExUpdate = Promise.resolve()
    // TODO: Errors should go to CommandLine.
    try {
        const [func, args] = exmode_parser(exstr, stored_excmds)
        // Don't store repeat, command-line display, update checks, or private-window commands
        if (
            !config
                .get("repeatblacklist")
                .some(excmd => func === stored_excmds[""][excmd]) &&
            func !== stored_excmds[""].repeat &&
            func !== stored_excmds[""].fillcmdline &&
            func !== stored_excmds[""].fillcmdline_notrail &&
            func !== stored_excmds[""].fillcmdline_tmp &&
            func !== stored_excmds[""].fillcmdline_nofocus &&
            func !== stored_excmds[""].updatecheck &&
            exstr.search("winopen -private") < 0
        ) {
            lastExUpdate = State.getAsync("last_ex_str").then(last_ex_str => {
                if (last_ex_str != exstr)
                    return State.setAsync("last_ex_str", exstr)
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
    } finally {
        currentExCmdSource = previousExCmdSource
        void lastExUpdate.then(
            () => exCmdListener?.(),
            () => exCmdListener?.(),
        )
    }
}

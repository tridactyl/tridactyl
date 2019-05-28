import Logger from "@src/lib/logging"
import { parser as exmode_parser } from "@src/parsers/exmode"

const logger = new Logger("controller")

let stored_excmds: any
export function setExCmds(excmds: any) {
    stored_excmds = excmds
}

export let last_ex_str = ""

/** Parse and execute ExCmds */
export async function acceptExCmd(exstr: string): Promise<any> {
    // TODO: Errors should go to CommandLine.
    try {
        const [func, args] = exmode_parser(exstr, stored_excmds)
        // Stop the repeat excmd from recursing.
        if (func !== stored_excmds[""].repeat) last_ex_str = exstr
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

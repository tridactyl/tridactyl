import Logger from "@src/lib/logging"
import { parser as exmode_parser } from "@src/parsers/exmode"

const logger = new Logger("controller")

let stored_excmds
export function setExCmds(excmds: any) {
    stored_excmds = excmds
}

/** Parse and execute ExCmds */
export let last_ex_str = ""
export async function acceptExCmd(exstr: string): Promise<any> {
    // TODO: Errors should go to CommandLine.
    try {
        let [func, args] = exmode_parser(exstr, stored_excmds)
        // Stop the repeat excmd from recursing.
        if (func !== stored_excmds.repeat) last_ex_str = exstr
        try {
            return await func(...args)
        } catch (e) {
            // Errors from func are caught here (e.g. no next tab)
            logger.error("content_controller in excmd: ", e)
        }
    } catch (e) {
        // Errors from parser caught here
        logger.error("content_controller while accepting: ", e)
    }
}

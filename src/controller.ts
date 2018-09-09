import Logger from "./logging"
import { parser as exmode_parser } from "./parsers/exmode"

const logger = new Logger("controller")

/** Parse and execute ExCmds */
export let last_ex_str = ""
export async function acceptExCmd(exstr: string, excmds: any): Promise<any> {
    // TODO: Errors should go to CommandLine.
    try {
        let [func, args] = exmode_parser(exstr, excmds)
        // Stop the repeat excmd from recursing.
        if (func !== excmds.repeat) last_ex_str = exstr
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

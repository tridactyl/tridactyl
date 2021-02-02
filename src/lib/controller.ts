import Logger from "@src/lib/logging"
import { parser2020 } from "@src/parsers/exmode2020"
import * as State from "@src/state"
import state from "@src/state"

const logger = new Logger("controller")

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

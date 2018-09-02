import { parser as exmode_parser } from "./parsers/exmode"
import { repeat } from "./.excmds_background.generated"

import Logger from "./logging"

const logger = new Logger("controller")

export let last_ex_str = ""

/** Parse and execute ExCmds */
// TODO(saulrh): replace this with messaging to the background
export async function acceptExCmd(exstr: string): Promise<any> {
    // TODO: Errors should go to CommandLine.
    try {
        let [func, args] = exmode_parser(exstr)
        // Stop the repeat excmd from recursing.
        if (func !== repeat) last_ex_str = exstr
        try {
            return await func(...args)
        } catch (e) {
            // Errors from func are caught here (e.g. no next tab)
            logger.error("background_controller: ", e)
        }
    } catch (e) {
        // Errors from parser caught here
        logger.error("background_controller: ", e)
    }
}

import * as Messaging from "./messaging"

// Get messages from content
Messaging.addListener(
    "controller_background",
    Messaging.attributeCaller({
        acceptExCmd,
    }),
)

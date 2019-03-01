/** Ex Mode (AKA cmd mode) */

import * as ExCmds from "@src/.excmds_background.generated"
import * as convert from "@src/lib/convert"
import * as Config from "@src/lib/config"
import * as aliases from "@src/lib/aliases"
import * as Logging from "@src/lib/logging"
import { enumerate, head, izip } from "@src/lib/itertools"
import { exmodeScanner } from "@src/parsers/lex_grammar"
const logger = new Logging.Logger("exmode")

// Simplistic Ex command line parser.
// TODO: Pipe to separate commands
export function parser(exstr: string): any[] {
    // Expand aliases
    const expandedExstr = aliases.expandExstr(exstr)
    const [excmd, ...rest] = exmodeScanner(expandedExstr)
    const func = excmd.raw_in
    const args = rest.map(x => x.processed)

    if (ExCmds.cmd_params.has(func)) {
        try {
            return [ExCmds[func], args]
        } catch (e) {
            logger.error("Error executing or parsing:", exstr, e)
            throw e
        }
    } else {
        logger.error("Not an excmd:", exstr)
        throw `Not an excmd: ${func}`
    }
}

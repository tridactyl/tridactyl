import { KeyMap, PrintableKey } from "@src/lib/keyseq"
import Logger from "@src/lib/logging"

const logger = new Logger("whichkey")

export function whichKey(keyseq: string, possibleMappings?: KeyMap) {
    logger.debug(keyseq)
    if (possibleMappings?.size === 0) {
        return undefined
    }
    for (const [key, target] of possibleMappings) {
        const suffix = key
            .slice(keyseq.length)
            .map(x => PrintableKey(x))
            .join("")
        logger.debug(suffix, target)
    }
}

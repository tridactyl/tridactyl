import { KeyMap /* , PrintableKey*/ } from "@src/lib/keyseq"
import Logger from "@src/lib/logging"
import * as Messaging from "@src/lib/messaging"

const logger = new Logger("whichkey")

/** Display possible suffixes with their respective targets */
export function whichKey(prefix: string, possibleMappings?: KeyMap) {
    if (!possibleMappings || possibleMappings.size === 0) {
        return
    }

    const maps: Map<string, string> = new Map()
    for (let [key, target] of possibleMappings) {
        const suffix = key.slice(prefix.length)
        // if suffix has multiple terminators, only show multiple suffixes
        if (suffix.length > 1) {
            // TODO: target should be setable by user
            target = "+prefix"
        }
        const printableSuffix = suffix[0].toMapstr()
        maps.set(printableSuffix, target as string)
    }
    logger.debug(maps)
    Messaging.messageOwnTab("whichkey_content", "show")
    Messaging.messageOwnTab("whichkey_frame", "showMappings", [prefix, maps])
}

export function hideWhichKey() {
    Messaging.messageOwnTab("whichkey_content", "hide")
}

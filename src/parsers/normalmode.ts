/** Tridactyl normal mode */

import * as config from "../config"
import * as keyseq from "../keyseq"

export function parser(keys): keyseq.ParserResponse {
    let nmaps: any = config.get("nmaps")
    // Remove unbound keys
    nmaps = Object.entries(nmaps).filter(([k, v]) => v !== "")
    // Convert to KeyMap
    nmaps = keyseq.mapstrMapToKeyMap(new Map(nmaps))

    return keyseq.parse(keys, nmaps)
}

/** Tridactyl normal mode */

import * as config from "../config"
import * as keyseq from "../keyseq"

export function parser(keys): keyseq.ParserResponse {
    const result = keyseq.parse(
        keys,
        keyseq.mapstrObjToKeyMap(config.get("nmaps")),
    )
    if (result.value === "") {
        // This is supposed to be unbound, so pretend it didn't match
        return { keys: [], isMatch: false }
    }
    return result
}

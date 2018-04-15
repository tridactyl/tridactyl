/** Tridactyl normal mode */

import * as config from "../config"
import * as keyseq from "../keyseq"

export function parser(keys): keyseq.ParserResponse {
    return keyseq.parse(keys, keyseq.mapstrObjToKeyMap(config.get("nmaps")))
}

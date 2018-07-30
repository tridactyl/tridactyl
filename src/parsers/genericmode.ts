/** Tridactyl helper mode */

import * as config from "../config"
import * as keyseq from "../keyseq"

export function parser(conf, keys): keyseq.ParserResponse {
    let maps: any = config.get(conf)
    // Remove unbound keys
    maps = Object.entries(maps).filter(([k, v]) => v !== "")
    // Convert to KeyMap
    maps = keyseq.mapstrMapToKeyMap(new Map(maps))

    return keyseq.parse(keys, maps)
}

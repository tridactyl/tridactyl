/** Tridactyl helper mode */

import * as config from "@src/lib/config"
import * as keyseq from "@src/lib/keyseq"

export function parser(conf, keys): keyseq.ParserResponse {
    let maps: any = config.get(conf)

    // If so configured, translate keys using the key translation map
    if (config.get("keytranslatemodes")[conf] === "true") {
        const translationmap = config.get("keytranslatemap")
        keyseq.translateKeysUsingKeyTranslateMap(keys, translationmap)
    }

    // Remove unbound keys
    maps = Object.entries(maps).filter(([k, v]) => v !== "")
    // Convert to KeyMap
    maps = keyseq.mapstrMapToKeyMap(new Map(maps))

    return keyseq.parse(keys, maps)
}

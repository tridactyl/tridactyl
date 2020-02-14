/** Tridactyl helper mode */

import * as config from "@src/lib/config"
import * as keyseq from "@src/lib/keyseq"

export function parser(conf, keys): keyseq.ParserResponse {
    let maps: any = config.get(conf)
    if (maps === undefined) throw new Error("No binds defined for this mode. Reload page with <C-r> and add binds, e.g. :bind --mode=[mode] <Esc> mode normal")

    // If so configured, translate keys using the key translation map
    if (config.get("keytranslatemodes")[conf] === "true") {
        const translationmap = config.get("keytranslatemap")
        keyseq.translateKeysUsingKeyTranslateMap(keys, translationmap)
    }

    // Convert to KeyMap
    maps = new Map(Object.entries(maps))
    maps = keyseq.mapstrMapToKeyMap(maps)

    return keyseq.parse(keys, maps)
}

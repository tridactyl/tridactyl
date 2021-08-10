/** Tridactyl helper mode */

import * as keyseq from "../lib/keyseq"

export function parser(conf, keys): keyseq.ParserResponse {
    const maps = keyseq.keyMap(conf)
    keyseq.translateKeysInPlace(keys, conf)
    return keyseq.parse(keys, maps)
}

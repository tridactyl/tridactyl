/** Tridactyl helper mode */

import * as keyseq from "@src/lib/keyseq"

export function parser(conf, keys): keyseq.ParserResponse {
    const maps = keyseq.keyMap(conf, keys)
    return keyseq.parse(keys, maps)
}

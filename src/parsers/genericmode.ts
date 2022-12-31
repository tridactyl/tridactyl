/** Tridactyl helper mode */

import * as keyseq from "@src/lib/keyseq"

export function parser(conf, keys: keyseq.MinimalKey[]): keyseq.ParserResponse {
    const maps = keyseq.keyMap(conf)
    return keyseq.parse(keys, maps)
}

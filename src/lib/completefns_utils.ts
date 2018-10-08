/**
 * Provides a number of utility functions that implement common
 * behaviors for completion functions.
 *
 */

import * as Logging from "@src/lib/logging"
import * as aliases from "@src/lib/aliases"
import { ExcmdInputState } from "@src/lib/completefns"

const logger = new Logging.Logger("completions")

// Returns true if any the input state is prefixed by any of the given
// prefixes. This is a common (albeit primitive) pattern for detecting
// excmds that should trigger various completions for positional
// arguments. For example, a completion that lists tabs might say that
// its prefixes are ["buffer", "tabclose", ...].
//
// Returns: [whether a prefix matches, the prefix that matched, the
// rest of the input]
export function prefixed(inputState: ExcmdInputState, prefixes: string[]): [boolean, string?, string?] {
    // Trim prefixes.
    prefixes = prefixes.map(p => p.trim())

    // Recursively expand aliases until no more expansions are found
    let commands = aliases.getCmdAliasMapping()
    prefixes.forEach(p => {
        if (commands[p]) prefixes = prefixes.concat(commands[p])
    })

    for (const prefix of this.prefixes) {
        if (inputState.currentLine.startsWith(prefix)) {
            const rest = inputState.currentLine.replace(prefix, "")
            return [true, prefix.trim(), rest.trim()]
        }
    }
    return [false, undefined, undefined]
}

import * as config from "./config"

/**
 * Expands the alias in the provided exstr recursively. Does nothing if
 * the command is not aliased, including when the command is invalid.
 *
 * @param exstr :exstr typed by the user on the commantd line
 */
export function expandExstr(
    exstr: string,
    aliases = config.get("exaliases"),
    prevExpansions: string[] = []
): string {
    // Split on whitespace
    const [command, ...args] = exstr.trim().split(/\s+/)

    // Base case: alias not found; return original command
    if(aliases[command] === undefined) {
        return exstr
    }

    // Infinite loop detected
    if(prevExpansions.includes(command)) {
        throw `Infinite loop detected while expanding aliases. Stack: ${prevExpansions}.`
    }

    // Add command to expansions used so far
    prevExpansions.push(command)

    // Alias exists; expand it recursively
    return expandExstr(exstr.replace(command, aliases[command]), aliases, prevExpansions)
}

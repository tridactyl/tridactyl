import * as Config from "./config"

export function commandIsAlias(command: string): boolean {
    return Config.get("exaliases", command) !== undefined
}

/**
 * Expands the alias in the provided exstr recursively. Does nothing if
 * the command is not aliased, including when the command is invalid.
 *
 * @param exstr :exstr typed by the user on the commantd line
 */
export function expandExstr(exstr: string): string {
    // Split on whitespace
    const [command, ...args] = exstr.trim().split(/\s+/)
    const expandedCommand = getAliasExpandRecur(command)

    // Replace only replaces first occurence by default
    const expandedExstr = exstr.replace(command, expandedCommand)
    return expandedExstr
}

/**
 * Expands the given command recursively. Does nothing if the command is not
 * aliased, including when it is invalid.
 *
 * @param command The command portion of the exstr
 */
export function getAliasExpandRecur(
    command: string, prevExpansions: string[] = []): string {

    // Base case: alias not found; return original command
    if(!commandIsAlias(command)) {
        return command
    }

    // Infinite loop detected
    if(prevExpansions.includes(command)) {
        throw `Infinite loop detected while expanding aliases. Stack: ${prevExpansions}.`
    }

    // Add command to expansions used so far
    prevExpansions.push(command)

    // Alias exists; expand it recursively
    const expanded = Config.get("exaliases", command)
    return getAliasExpandRecur(expanded, prevExpansions)
}

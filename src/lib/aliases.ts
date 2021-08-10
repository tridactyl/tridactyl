import * as config from "../lib/config"

/**
 * Expands the alias in the provided exstr recursively. Does nothing if
 * the command is not aliased, including when the command is invalid.
 *
 * @param exstr :exstr typed by the user on the commantd line
 */
export function expandExstr(
    exstr: string,
    aliases = config.get("exaliases"),
    prevExpansions: string[] = [],
): string {
    // Split on whitespace
    const [command] = exstr.trim().split(/\s+/)

    // Base case: alias not found; return original command
    if (aliases[command] === undefined) {
        return exstr
    }

    // Infinite loop detected
    if (prevExpansions.includes(command)) {
        throw new Error(
            `Infinite loop detected while expanding aliases. Stack: ${prevExpansions}.`,
        )
    }

    // Add command to expansions used so far
    prevExpansions.push(command)

    // Alias exists; expand it recursively
    return expandExstr(
        exstr.replace(command, aliases[command]),
        aliases,
        prevExpansions,
    )
}

/**
 * Get all aliases for all commands.
 *
 * @param aliases An object mapping aliases to commands
 * @return commands An object mapping commands to an array of aliases
 */
export function getCmdAliasMapping(
    aliases = config.get("exaliases"),
): { [str: string]: string[] } {
    const commands = {}
    // aliases look like this: {alias: command} but what we really need is this: {command: [alias1, alias2...]}
    // This is what this loop builds
    for (const alias of Object.keys(aliases)) {
        const cmd = expandExstr(alias, aliases).trim()
        if (!commands[cmd]) commands[cmd] = []
        commands[cmd].push(alias.trim())
    }
    return commands
}

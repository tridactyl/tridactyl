import * as config from "./config"
import * as Util from "./util"

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
    const cmd = Util.extractCommandFromExstr(exstr)
    const expanded = expandCommand(cmd, aliases, prevExpansions)
    // This will only replace the first occurrence
    return exstr.replace(cmd, expanded)
}

/**
 *  Same as 'expandExstr` but accepts only the command itself.
 */
export function expandCommand(
    cmd: string,
    aliases = config.get("exaliases"),
    prevExpansions: string[] = [],
): string {
    // Base case: alias not found; return original
    if (!aliases[cmd]) return cmd

    // Infinite loop detected
    if (prevExpansions.includes(cmd))
        throw Error(
            `Infinite loop detected while expanding aliases. Stack: ${prevExpansions}.`,
        )
    // Add previous expansions to stack
    prevExpansions.push(cmd)

    // Alias exists: recurse with newly found alias
    return expandCommand(aliases[cmd], aliases, prevExpansions)
}

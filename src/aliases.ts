import * as Config from "./config"

export function commandIsAlias(command: string): boolean {
    return Config.get("exaliases", command) !== undefined
}

export function expandExstr(exstr: string): string {
    // Split on whitespace
    const [command, ...args] = exstr.trim().split(/\s+/)
    const expandedCommand = getAliasExpandRecur(command)

    // Replace only replaces first occurence by default
    const expandedExstr = exstr.replace(command, expandedCommand)
    return expandedExstr
}

export function getAliasExpandRecur(command: string): string {
    // Base case: alias not found; return original command
    if(!commandIsAlias(command)) {
        return command
    }

    // Alias exists; expand it recursively
    const expanded = Config.get("exaliases", command)
    return getAliasExpandRecur(expanded)
}
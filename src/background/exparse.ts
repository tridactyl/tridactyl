import * as I from 'immutable'

/**
 * Tokenises the string. SHOULD BE REPLACED WITH A BETTER ALGORITHM.
 *
 * @param exstr The passed in exstring
 */
function tokeniseExstr(exstr: string): I.List<string> {
    const split = exstr.split(' ')
    return I.List(split)
}

export function getCommand(exstr: string): string {
    return exstr.split(' ')[0]
}

export function expandCommand(
    cmd: string,
    mappings: I.Map<string, string>
): string {
    return `Unimplemented`
}

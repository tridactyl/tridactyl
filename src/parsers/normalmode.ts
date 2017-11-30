/** Tridactyl normal mode:

    differs from Vim in that no map may be a prefix of another map (e.g. 'g' and 'gg' cannot both be maps). This simplifies the parser.
*/

import * as config from '../config'

let nmaps = config.get("nmaps")


// Split a string into a number prefix and some following keys.
function keys_split_count(keys: string[]){
    // Extracts the first number with capturing parentheses
    const FIRST_NUM_REGEX = /^([0-9]+)/

    let keystr = keys.join("")
    let regexCapture = FIRST_NUM_REGEX.exec(keystr)
    let count = regexCapture ? regexCapture[0] : null
    keystr = keystr.replace(FIRST_NUM_REGEX,"")
    return [count, keystr]
}

// Given a valid keymap, resolve it to an ex_str
function resolve_map(map) {
    // TODO: This needs to become recursive to allow maps to be defined in terms of other maps.
    return config.get("nmaps")[map]
}

// Valid keystr to ex_str by splitting count, resolving keystr and appending count as final argument.
// TODO: This is a naive way to deal with counts and won't work for ExCmds that don't expect a numeric answer.
// TODO: Refactor to return a ExCmdPartial object?
function get_ex_str(keys): string {
    let [count, keystr] = keys_split_count(keys)
    let ex_str = resolve_map(keystr)
    if (ex_str){
        ex_str = count ? ex_str + " " + count : ex_str
    }
    return ex_str
}

// A list of maps that keys could potentially map to.
function possible_maps(keys): string[] {
    let [count, keystr] = keys_split_count(keys)

    // Short circuit or search maps.
    if (Object.getOwnPropertyNames(config.get("nmaps")).includes(keystr)) {
        return [keystr,]
    } else {
        // Efficiency: this can be short-circuited.
        return completions(keystr)
    }
}

// A list of maps that start with the fragment.
export function completions(fragment): string[] {
    let posskeystrs = Array.from(Object.keys(config.get("nmaps")))
    return posskeystrs.filter((key)=>key.startsWith(fragment))
}

export interface NormalResponse {
    keys?: string[]
    ex_str?: string
}

export function parser(keys): NormalResponse {
    // If there aren't any possible matches, throw away keys until there are
    while ((possible_maps(keys).length == 0) && (keys.length)) {
        keys = keys.slice(1)
    }

    // If keys map to an ex_str, send it
    let ex_str = get_ex_str(keys)
    if (ex_str){
        return {ex_str}
    }
    // Otherwise, return the keys that might be used in a future command
    return {keys}
}

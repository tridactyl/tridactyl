/** Shim to access BG browser APIs from content. */

export function shim(api, func, args) {
    return browser[api][func](...args)
}

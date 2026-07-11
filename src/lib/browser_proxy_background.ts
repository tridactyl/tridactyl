/** Shim to access BG browser APIs from content. */

import * as compat from "@src/lib/compat"

export function shim(api, func, args) {
    const implementation = compat[api] && compat[api][func]
    if (typeof implementation === "function") return implementation(...args)
    return browser[api][func](...args)
}

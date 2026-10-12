/** Shim to access BG browser APIs from content. */

import * as compat from "@src/lib/compat"
import type { CapabilityRoute } from "@src/lib/browser_proxy"

type Route = "browser" | "compat" | "desktop" | "firefox" | "firefoxDesktop"

function invoke(root, api, func, args) {
    const implementation = root[api] && root[api][func]
    if (typeof implementation !== "function")
        throw new Error(`Missing compatibility implementation: ${api}.${func}`)
    return implementation(...args)
}

export async function hasCapability(route: CapabilityRoute) {
    if (route === "desktop") return (await compat.getDesktop()).kind === "desktop"
    if (route === "firefox") return compat.getFirefox().kind === "firefox"
    return (await compat.getFirefoxDesktop()).kind === "firefoxDesktop"
}

export function shim(route: Route, api, func, args) {
    if (route === "browser") return browser[api][func](...args)
    if (route === "desktop")
        return compat.requireDesktop().then(root => invoke(root, api, func, args))
    if (route === "firefox")
        return invoke(compat.requireFirefox(), api, func, args)
    if (route === "firefoxDesktop")
        return compat
            .requireFirefoxDesktop()
            .then(root => invoke(root, api, func, args))
    if (route === "compat") return compat.callProxy(api, func, args)
    throw new Error(`Unknown browser proxy route: ${route}`)
}

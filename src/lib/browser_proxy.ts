import { message } from "@src/lib/messaging"

type Compat = typeof import("@src/lib/compat")
type ProxyShape = import("@src/lib/compat").ProxyApis
export type CompatApis = {
    [K in keyof ProxyShape & keyof Compat]: {
        [M in keyof ProxyShape[K] & keyof Compat[K]]: Compat[K][M]
    }
}

type Route = "browser" | "compat" | "desktop" | "firefox" | "firefoxDesktop"
export type CapabilityRoute = Exclude<Route, "browser" | "compat">

export function hasCapability(route: CapabilityRoute): Promise<boolean> {
    return message("browser_proxy_background", "hasCapability", route)
}

function makeProxy(route: Route) {
    return new Proxy(Object.create(null), {
        get(target, api) {
            return new Proxy(
                {},
                {
                    get(_, func) {
                        return (...args) =>
                            message(
                                "browser_proxy_background",
                                "shim",
                                route,
                                api,
                                func,
                                args,
                            )
                    },
                },
            )
        },
    })
}

const browserProxy = makeProxy("browser") as typeof browser
export const compatProxy = makeProxy("compat") as CompatApis

export function desktopProxy(): import("@src/lib/compat").DesktopApis {
    return makeProxy("desktop") as import("@src/lib/compat").DesktopApis
}

export function firefoxProxy(): import("@src/lib/compat").FirefoxApis {
    return makeProxy("firefox") as import("@src/lib/compat").FirefoxApis
}

export function firefoxDesktopProxy(): import("@src/lib/compat").FirefoxDesktopApis {
    return makeProxy("firefoxDesktop") as import("@src/lib/compat").FirefoxDesktopApis
}

export default browserProxy

import { message } from "@src/lib/messaging"

type Compat = typeof import("@src/lib/compat")

type Methods<T> = {
    [K in keyof T as T[K] extends (...args: any[]) => any ? K : never]: T[K]
}

export type CompatApis = {
    [K in keyof Compat as Compat[K] extends (...args: any[]) => any
        ? never
        : K]: Methods<Compat[K]>
}

type BrowserProxy = typeof browser & CompatApis

const browserProxy = new Proxy(Object.create(null), {
    get(target, api) {
        return new Proxy(
            {},
            {
                get(_, func) {
                    return (...args) =>
                        message(
                            "browser_proxy_background",
                            "shim",
                            api,
                            func,
                            args,
                        )
                },
            },
        )
    },
}) as BrowserProxy

export default browserProxy

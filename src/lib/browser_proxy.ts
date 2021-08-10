import { message } from "../lib/messaging"

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
}) as typeof browser

export default browserProxy

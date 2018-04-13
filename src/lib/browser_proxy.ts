import { message } from "../messaging"

const browserProxy = new Proxy(Object.create(null), {
    get: function(target, api) {
        return new Proxy(
            {},
            {
                get: function(_, func) {
                    return (...args) =>
                        message("browser_proxy_background", "shim", [
                            api,
                            func,
                            args,
                        ])
                },
            },
        )
    },
}) as typeof browser

export default browserProxy

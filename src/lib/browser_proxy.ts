import { message } from "@src/lib/messaging"
import * as Messages from "@src/message_protocols"

const browserProxy = new Proxy(Object.create(null), {
    get(target, api) {
        return new Proxy(
            {},
            {
                get(_, func) {
                    return (...args) =>
                        message<Messages.Background>()("browser_proxy_background", "shim", [
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

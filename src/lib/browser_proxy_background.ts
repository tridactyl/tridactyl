/** Shim to access BG browser APIs from content. */

function shim(api, func, args) {
    return browser[api][func](...args)
}

import { addListener, attributeCaller, MessageType } from "../messaging"
addListener(
    "browser_proxy_background" as MessageType,
    attributeCaller({ shim }),
)

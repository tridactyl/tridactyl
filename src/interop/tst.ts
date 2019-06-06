import * as ExtensionInfo from "@src/lib/extension_info"

async function _registerWithTST(manual = false) {
    try {
        await ExtensionInfo.messageExtension("tree_style_tab", {
            type: "register-self",
            name: "Tridactyl",
            icons: browser.runtime.getManifest().icons,
            listeningTypes: ["ready", "permissions-changed"],
            permissions: ["tabs"]
        })
    } catch (e) {
        if (manual) throw new Error("TreeStyleTab hasn't finished loading: " + e)
    }
    REGISTERED = true
}

// Register once TST says that it is ready
export async function registerWithTST(manual = false) {
    // If we were invoked manually, bail out loudly if TST isn't
    // installed and enabled.
    if (!ExtensionInfo.getExtensionEnabled("tree_style_tab") && manual) {
        throw new Error("TreeStyleTab not installed or not enabled")
    }

    // If we've already registered with TST, it knows about us and
    // will tell us whenever we need to reinitialize our connection
    // with it.
    ExtensionInfo.listenForMessage("tree_style_tab", message => {
        if (message.type === "ready" || message.type === "permissions-changed") {
            _registerWithTST()
        }
    })

    // If we've never registered with TST it won't know to send us a
    // message, so go out and try to make friends with it.
    //
    // If we were invoked manually, wait until we either get an error
    // or our message is received from TST.
    const tst_promise = _registerWithTST(manual)
    if (manual) {
        await tst_promise
    }
}

// WARNING: module-level state!
let REGISTERED = false
registerWithTST()


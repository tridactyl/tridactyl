export const TST_ID = "treestyletab@piro.sakura.ne.jp"

async function _registerWithTST(manual = false) {
    try {
        await browser.runtime.sendMessage(TST_ID, {
            type: "register-self",
            name: browser.i18n.getMessage("extensionName"),
            icons: browser.runtime.getManifest().icons,
            listeningTypes: [],
            permissions: ["tabs"]
        })
    } catch (e) {
        if (manual) throw new Error("TreeStyleTab hasn't finished loading: " + e)
    }
}

// Register once TST says that it is ready
export async function registerWithTST(manual = false) {
    try {
        await browser.management.get(TST_ID)
    } catch (e) {
        // We get an error if TST isn't found
        if (manual) throw new Error("TreeStyleTab couldn't be found: " + e)
    }
    // Initial registration must be done manually (i.e. make an excmd)/ on install
    // but after that TST will tell us it is ready
    browser.runtime.onMessageExternal.addListener((message, sender) => {
        if (sender.id === TST_ID && (message.type === "ready" || message.type === "permissions-changed")) _registerWithTST()
    })
    const tst_prom = _registerWithTST(manual) // TST won't send a message if we've never registered before, so try it anyway
    if (manual) await tst_prom
}

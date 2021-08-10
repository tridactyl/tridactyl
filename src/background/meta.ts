import { messageTab } from "../lib/messaging"

export async function getTridactylTabs(
    tabs?: browser.tabs.Tab[],
    negate = false,
) {
    tabs = tabs || (await browser.tabs.query({ currentWindow: true }))
    const tridactyl_tabs: browser.tabs.Tab[] = []
    await Promise.all(
        tabs.map(async tab => {
            try {
                // This doesn't actually return "true" like it is supposed to
                await messageTab(tab.id, "alive")
                !negate && tridactyl_tabs.push(tab)
                return true
            } catch (e) {
                negate && tridactyl_tabs.push(tab)
                return false
            }
        }),
    )
    return tridactyl_tabs
}

import { activeTab, activeTabId } from "@src/lib/webext"
import * as Logging from "@src/lib/logging"

const logger = new Logging.Logger("excmds")

/** Resolve a tab index to the tab id of the corresponding tab in this window.

    @param index
        1-based index of the tab to target. Wraps such that 0 = last tab, -1 =
        penultimate tab, etc.

        also supports # for previous tab, % for current tab.

        if undefined, return activeTabId()
*/
async function idFromIndex(index?: number | "%" | "#" | string): Promise<number> {
    if (index === "#") {
        // Support magic previous/current tab syntax everywhere
        const tabs = await getSortedWinTabs()
        if (tabs.length < 2) {
            // In vim, '#' is the id of the previous buffer even if said buffer has been wiped
            // However, firefox doesn't store tab ids for closed tabs
            // Since vim makes '#' default to the current buffer if only one buffer has ever been opened for the current session, it seems reasonable to return the id of the current tab if only one tab is opened in firefox
            return activeTabId()
        }
        return tabs[1].id
    } else if (index !== undefined && index !== "%") {
        // Wrap
        index = Number(index)
        index = (index - 1).mod((await browser.tabs.query({ currentWindow: true })).length) + 1

        // Return id of tab with that index.
        return (await browser.tabs.query({
            currentWindow: true,
            index: index - 1,
        }))[0].id
    } else {
        return activeTabId()
    }
}

export async function tabSetActive(id: number) {
    return browser.tabs.update(id, { active: true })
}

/** Switch to the tab by index (position on tab bar), wrapping round.

    @param index
        1-based index of the tab to target. Wraps such that 0 = last tab, -1 =
        penultimate tab, etc.

        if undefined, return activeTabId()
*/
export async function tabIndexSetActive(index: number | string) {
    return tabSetActive(await idFromIndex(index))
}

export async function tabduplicate(index?: number) {
    browser.tabs.duplicate(await idFromIndex(index))
}

export async function tabdetach(index?: number) {
    browser.windows.create({ tabId: await idFromIndex(index) })
}

/** Get list of tabs sorted by most recent use
*/
async function getSortedWinTabs(): Promise<browser.tabs.Tab[]> {
    const tabs = await browser.tabs.query({ currentWindow: true })
    tabs.sort((a, b) => (a.lastAccessed < b.lastAccessed ? 1 : -1))
    return tabs
}

export async function tabonly() {
    const tabs = await browser.tabs.query({
        pinned: false,
        active: false,
        currentWindow: true,
    })
    const tabsIds = tabs.map(tab => tab.id)
    browser.tabs.remove(tabsIds)
}

export async function tabnext_gt(index?: number) {
    if (index === undefined) {
        tabnext()
    } else {
        tabIndexSetActive(index)
    }
}

export async function tabnext(increment = 1) {
    return tabprev(-increment)
}

export async function tabprev(increment = 1) {
    // Proper way:
    // return tabIndexSetActive((await activeTab()).index - increment + 1)
    // Kludge until https://bugzilla.mozilla.org/show_bug.cgi?id=1504775 is fixed:
    return browser.tabs.query({ currentWindow: true, hidden: false }).then(tabs => {
        tabs.sort((t1, t2) => t1.index - t2.index)
        const prevTab = (tabs.findIndex(t => t.active) - increment + tabs.length) % tabs.length
        return browser.tabs.update(tabs[prevTab].id, { active: true })
    })
}

export async function tabclose(...indexes: string[]) {
    if (indexes.length > 0) {
        let ids: number[]
        ids = await Promise.all(indexes.map(index => idFromIndex(index)))
        browser.tabs.remove(ids)
    } else {
        // Close current tab
        browser.tabs.remove(await activeTabId())
    }
}

export async function tab(index: number | "#") {
    tabIndexSetActive(index)
}

export async function taball(id: string) {
    const windows = (await browser.windows.getAll()).map(w => w.id).sort((a, b) => a - b)
    if (id === null || id === undefined || !id.match(/\d+\.\d+/)) {
        const tab = await activeTab()
        const prevId = id
        id = windows.indexOf(tab.windowId) + "." + (tab.index + 1)
        logger.info(`taball: Bad tab id: ${prevId}, defaulting to ${id}`)
    }
    const [winindex, tabindex] = id.split(".")
    await browser.windows.update(windows[parseInt(winindex, 10) - 1], { focused: true })
    return browser.tabs.update(await idFromIndex(tabindex), { active: true })
}

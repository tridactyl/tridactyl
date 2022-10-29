export async function saveTabHistory(tabid, history) {
    await browser.sessions.setTabValue(tabid, "history", history)
}

/** Returns a promise for an object with history list, index of a current, previous and next pages */
export async function curTabHistory(tabid) {
    return await browser.sessions.getTabValue(tabid, "history")
}

function isHistoryNavigation(nav) {
    return nav.transitionQualifiers.includes("forward_back")
}

// Adds a new entry to history tree or updates it if already visited
export async function addTabHistory(nav) {
    const frameTop = 0
    if (nav.frameId != frameTop) return
    const tabid = nav.tabId
    let pages = await curTabHistory(tabid)
    if (!pages)
        pages = {
            current: null,
            list: [],
        }
    if (isHistoryNavigation(nav)) {
        let itemId = pages.list.length - 1
        while (true) {
            const item = pages["list"][itemId]
            if (nav.url == item.href) {
                pages.current = itemId
                item.time = nav.timeStamp
                return await saveTabHistory(tabid, pages)
            }
            itemId = item.parent
            if (itemId == null) break
        }
    }
    const tab = await browser.tabs.get(tabid)
    pages["list"].push({
        parent: pages["current"],
        href: nav.url,
        title: tab.title,
        id: pages["list"].length,
        time: nav.timeStamp,
    })
    pages["current"] = pages["list"].length - 1
    return await saveTabHistory(tabid, pages)
}

export const tabLock = new Map()
export function registTabHistory() {
    const tabHistoryHandler = async nav => {
        const tab = nav.tabId
        while (tabLock.has(tab)) {
            const lock = tabLock.get(tab)
            await lock
        }
        const lock = addTabHistory(nav)
        tabLock.set(tab, lock)
        await lock
        if (tabLock.get(tab) == lock) tabLock.delete(tab)
    }
    const navigation = browser.webNavigation
    navigation.onCommitted.addListener(tabHistoryHandler)
    navigation.onHistoryStateUpdated.addListener(tabHistoryHandler)
    navigation.onReferenceFragmentUpdated.addListener(tabHistoryHandler)
}

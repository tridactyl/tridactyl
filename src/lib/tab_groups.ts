import {
    activeTabId,
    activeWindowId,
    browserBg,
    removeActiveWindowValue,
} from "./webext"
import { Logger } from "./logging"

const logger = new Logger("tab_groups")

export const NATIVE_TAB_GROUP_COLORS = [
    "blue",
    "red",
    "yellow",
    "green",
    "pink",
    "purple",
    "cyan",
    "orange",
    "grey",
] as const

export type TabGroupColor = (typeof NATIVE_TAB_GROUP_COLORS)[number]

let nativeTabGroupsAvailable: boolean | undefined

export function hasNativeTabGroups(): boolean {
    if (nativeTabGroupsAvailable === undefined) {
        nativeTabGroupsAvailable =
            browserBg.tabs?.group !== undefined &&
            browserBg.tabGroups !== undefined
    }
    return nativeTabGroupsAvailable
}

export function normalizeColor(
    color: string | undefined,
): TabGroupColor | undefined {
    if (!color) return undefined
    const normalized = color.toLowerCase().trim()
    if (NATIVE_TAB_GROUP_COLORS.includes(normalized as TabGroupColor)) {
        return normalized as TabGroupColor
    }
    const aliases: Record<string, TabGroupColor> = {
        grey: "grey",
        gray: "grey",
    }
    return aliases[normalized]
}

async function getGroupIdFromName(
    name: string,
    windowId?: number,
): Promise<number | undefined> {
    if (!hasNativeTabGroups()) {
        return undefined
    }
    if (windowId === undefined) {
        windowId = await activeWindowId()
    }
    try {
        const groups = await browserBg.tabGroups.query({ windowId })
        const group = groups.find(g => g.title === name)
        return group?.id
    } catch (e) {
        logger.warning(`Failed to query tab groups: ${e}`)
        return undefined
    }
}

async function getOrCreateGroupId(
    name: string,
    windowId?: number,
    color?: string,
): Promise<number> {
    if (!hasNativeTabGroups()) {
        return -1
    }
    try {
        if (windowId === undefined) {
            windowId = await activeWindowId()
        }
        const groups = await browserBg.tabGroups.query({ windowId })
        const existingGroup = groups.find(g => g.title === name)
        if (existingGroup) {
            return existingGroup.id
        }
        const tab = await browserBg.tabs.create({
            windowId,
            active: false,
        })
        const groupId = await browserBg.tabs.group({
            tabIds: [tab.id],
            createProperties: { windowId },
        })
        const updateProps: { title: string; color?: TabGroupColor } = {
            title: name,
        }
        const normalizedColor = normalizeColor(color)
        if (normalizedColor) {
            updateProps.color = normalizedColor
        }
        await browserBg.tabGroups.update(groupId, updateProps)
        await browserBg.tabs.remove(tab.id)
        return groupId
    } catch (e) {
        logger.warning(
            `Failed to create native tab group "${name}": ${e}. Falling back to legacy storage.`,
        )
        return -1
    }
}

/**
 * Return a set of the current window's tab groups (empty if there are none).
 *
 * For native tab groups, returns the titles of all groups.
 *
 */
export async function tgroups() {
    if (hasNativeTabGroups()) {
        const windowId = await activeWindowId()
        try {
            const groups = await browserBg.tabGroups.query({ windowId })
            return new Set<string>(groups.map(g => g.title).filter(t => t))
        } catch (e) {
            logger.warning(`Failed to query tab groups: ${e}`)
        }
    }

    const groups = await browserBg.sessions.getWindowValue(
        await activeWindowId(),
        "tridactyl-tgroups",
    )
    return new Set<string>(groups as string[])
}

/**
 * Set the current window's tab groups.
 *
 * Note: For native tab groups, this is no-op since groups are managed by Firefox.
 *
 * @param groups The set of groups.
 *
 */
export async function setTgroups(groups: Set<string>) {
    if (hasNativeTabGroups()) {
        return
    }
    return browserBg.sessions.setWindowValue(
        await activeWindowId(),
        "tridactyl-tgroups",
        [...groups],
    )
}

/**
 * Clear the current window's tab groups.
 *
 */
export function clearTgroups() {
    return removeActiveWindowValue("tridactyl-tgroups")
}

/**
 * Return the active tab group for the a window or undefined.
 *
 * For native tab groups, returns the title of the group containing the active tab.
 *
 * @param id The id of the window. Use the current window if not specified.
 *
 */
export async function windowTgroup(id?: number) {
    if (hasNativeTabGroups()) {
        const windowId = id ?? (await activeWindowId())
        try {
            const activeTab = await browserBg.tabs.query({
                windowId,
                active: true,
            })
            if (!activeTab.length) return undefined
            const tab = activeTab[0]
            if (tab.groupId === -1) return undefined
            const groups = await browserBg.tabGroups.query({
                windowId,
            })
            const group = groups.find(g => g.id === tab.groupId)
            return group?.title
        } catch (e) {
            logger.warning(`Failed to get active tab group: ${e}`)
        }
    }

    if (id === undefined) {
        id = await activeWindowId()
    }
    return browserBg.sessions.getWindowValue(
        id,
        "tridactyl-active-tgroup",
    ) as unknown as string
}

/**
 * Set the active tab group for a window.
 *
 * For native tab groups, this switches to the first tab in the specified group.
 *
 * @param name The name of the new active tab group.
 * @param id The id of the window. Use the current window if not specified.
 *
 */
export async function setWindowTgroup(name: string, id?: number) {
    if (hasNativeTabGroups()) {
        const windowId = id ?? (await activeWindowId())
        const groupId = await getGroupIdFromName(name, windowId)
        if (groupId !== undefined) {
            try {
                const tabs = await browserBg.tabs.query({
                    windowId,
                    groupId,
                })
                if (tabs.length > 0) {
                    await browserBg.tabs.update(tabs[0].id, { active: true })
                }
            } catch (e) {
                logger.warning(`Failed to activate tab group "${name}": ${e}`)
            }
        }
        return
    }

    if (id === undefined) {
        id = await activeWindowId()
    }
    return browserBg.sessions.setWindowValue(
        id,
        "tridactyl-active-tgroup",
        name,
    )
}

/*
 * Return the last active tab group for a window or undefined.
 *
 * @param id The id of the window. Use the current window if not specified.
 *
 */
export async function windowLastTgroup(id?: number) {
    if (hasNativeTabGroups()) {
        try {
            const windowId = id ?? (await activeWindowId())
            const currentGroup = await windowTgroup(windowId)
            const groups = await browserBg.tabGroups.query({ windowId })
            const otherGroups = groups.filter(g => g.title !== currentGroup)
            if (otherGroups.length === 0) return undefined
            let lastGroup: string | undefined
            let maxLastAccessed = 0
            for (const group of otherGroups) {
                const tabs = await browserBg.tabs.query({
                    windowId,
                    groupId: group.id,
                })
                const groupLastAccessed = Math.max(
                    ...tabs.map(t => t.lastAccessed || 0),
                )
                if (groupLastAccessed > maxLastAccessed) {
                    maxLastAccessed = groupLastAccessed
                    lastGroup = group.title
                }
            }
            return lastGroup
        } catch (e) {
            logger.warning(`Failed to get last active tab group: ${e}`)
        }
    }

    const otherGroupsTabs = await tgroupTabs(await windowTgroup(id), true)
    if (otherGroupsTabs.length === 0) {
        return undefined
    }
    otherGroupsTabs.sort((a, b) => b.lastAccessed - a.lastAccessed)
    const lastTabId = otherGroupsTabs[0].id
    return tabTgroup(lastTabId)
}

/**
 * Clear the active tab group for the current window.
 *
 */
export function clearWindowTgroup() {
    return removeActiveWindowValue("tridactyl-active-tgroup")
}

/**
 * Return a tab's tab group.
 *
 * For native tab groups, returns the title of the group the tab belongs to.
 *
 * @param id The id of the tab. Use the current tab if not specified.
 *
 */
export async function tabTgroup(id?: number) {
    if (hasNativeTabGroups()) {
        const tabId = id ?? (await activeTabId())
        try {
            const tab = await browserBg.tabs.get(tabId)
            if (tab.groupId === -1) return undefined
            const groups = await browserBg.tabGroups.query({
                windowId: tab.windowId,
            })
            const group = groups.find(g => g.id === tab.groupId)
            return group?.title
        } catch (e) {
            logger.warning(`Failed to get tab group: ${e}`)
        }
    }

    if (id === undefined) {
        id = await activeTabId()
    }
    return browserBg.sessions.getTabValue(
        id,
        "tridactyl-tgroup",
    ) as unknown as string
}

/**
 * Return a list of tab ids.
 *
 * @param id An id, a list of ids, or undefined.
 *
 * If id is undefined, return a list of the current tab id.
 *
 */
async function tabIdsOrCurrent(ids?: number | number[]): Promise<number[]> {
    if (!ids) {
        ids = [await activeTabId()]
    } else if (!Array.isArray(ids)) {
        ids = [ids]
    }
    return ids
}

/**
 * Set the a tab's tab group.
 *
 * For native tab groups, adds the tab to the specified group.
 *
 * @param name The name of the tab group.
 * @param id The id(s) of the tab(s). Use the current tab if not specified.
 *
 */
export async function setTabTgroup(name: string, id?: number | number[]) {
    const ids = await tabIdsOrCurrent(id)

    if (hasNativeTabGroups()) {
        const windowId = await activeWindowId()
        const groupId = await getOrCreateGroupId(name, windowId)
        if (groupId === -1) {
            return Promise.all(
                ids.map(id =>
                    browserBg.sessions.setTabValue(id, "tridactyl-tgroup", name),
                ),
            )
        }
        try {
            return browserBg.tabs.group({
                tabIds: ids,
                groupId,
            })
        } catch (e) {
            logger.warning(`Failed to group tabs: ${e}`)
        }
    }

    return Promise.all(
        ids.map(id =>
            browserBg.sessions.setTabValue(id, "tridactyl-tgroup", name),
        ),
    )
}

/**
 * Clear all the tab groups.
 *
 * @param id The id(s) of the tab(s). Use the current tab if not specified.
 *
 */
export async function clearTabTgroup(id?: number | number[]) {
    const ids = await tabIdsOrCurrent(id)

    if (hasNativeTabGroups()) {
        try {
            return browserBg.tabs.ungroup(ids)
        } catch (e) {
            logger.warning(`Failed to ungroup tabs: ${e}`)
        }
    }

    return Promise.all(
        ids.map(id => {
            browserBg.sessions.removeTabValue(id, "tridactyl-tgroup")
        }),
    )
}

/**
 * Return a list of all tabs in a tab group.
 *
 * @param name The name of the tab group.
 * @param other Whether to return the tabs not in the tab group instead.
 * @param id The id of the window. Use the current window if not specified.
 *
 */
export async function tgroupTabs(
    name: string,
    other = false,
    id?: number,
): Promise<browser.tabs.Tab[]> {
    if (id === undefined) {
        id = await activeWindowId()
    }

    if (hasNativeTabGroups()) {
        const groupId = await getGroupIdFromName(name, id)
        if (groupId === undefined) {
            return other ? await browserBg.tabs.query({ windowId: id }) : []
        }
        try {
            const allTabs = await browserBg.tabs.query({ windowId: id })
            const groupTabs = await browserBg.tabs.query({
                windowId: id,
                groupId,
            })
            const groupTabIds = new Set(groupTabs.map(t => t.id))
            return allTabs.filter(tab =>
                other ? !groupTabIds.has(tab.id) : groupTabIds.has(tab.id),
            )
        } catch (e) {
            logger.warning(`Failed to query tabs for group "${name}": ${e}`)
            return []
        }
    }

    return browserBg.tabs.query({ windowId: id }).then(async tabs => {
        const sameGroupIndices = await Promise.all(
            tabs.map(async ({ id }) => {
                const groupMatched = (await tabTgroup(id)) == name
                return other ? !groupMatched : groupMatched
            }),
        )
        tabs = tabs.filter((_, index) => sameGroupIndices[index])
        return tabs
    })
}

/**
 * Return the id of the last selected tab in a tab group.
 *
 * @param name The name of the tab group.
 * @param previous Whether to return the tab selected before the last tab.
 *
 */
export async function tgroupLastTabId(name: string, previous = false) {
    const tabs = await tgroupTabs(name)
    tabs.sort((a, b) => b.lastAccessed - a.lastAccessed)
    if (previous) {
        return tabs[1].id
    } else {
        return tabs[0].id
    }
}

/**
 * Clear stored information for a tab group.
 *
 * @param name The name of the tab group.
 * @param newName A name to rename the group to.
 * @param id The id of the window. Use the current window if not specified.
 *
 * If newName is specified, add it as a stored group (if it doesn't already
 * exist), set the current window group to it, and set the group for all tabs in
 * the old group to it.
 *
 */
export async function tgroupClearOldInfo(
    oldName: string,
    newName?: string,
    id?: number,
) {
    const promises = []
    const groups = await tgroups()
    groups.delete(oldName)
    if (newName) {
        groups.add(newName)
    }
    promises.push(setTgroups(groups))

    if (id === undefined) {
        id = await activeWindowId()
    }

    if (newName) {
        promises.push(setWindowTgroup(newName, id))
        promises.push(
            tgroupTabs(oldName, false, id).then(tabs => {
                setTabTgroup(
                    newName,
                    tabs.map(tab => tab.id),
                )
            }),
        )
    }
    return Promise.all(promises)
}

/**
 * Activate the previously active tab in a tab group.
 *
 * @param name The name of the tab group to switch to.
 *
 */
export async function tgroupActivate(name: string) {
    const lastActiveTabId = await tgroupLastTabId(name)
    // this will trigger tgroupHandleTabActivated
    return browserBg.tabs.update(lastActiveTabId, { active: true })
}

/**
 * Activate the last active tab in the last active tab group.
 *
 * Return the name of activated tab group.
 *
 */
export async function tgroupActivateLast() {
    const lastTabGroup = await windowLastTgroup()
    return tgroupActivate(lastTabGroup).then(() => lastTabGroup)
}

/**
 * Clear all stored tab group information.
 *
 */
export async function clearAllTgroupInfo() {
    if (hasNativeTabGroups()) {
        try {
            const windowId = await activeWindowId()
            const tabs = await browserBg.tabs.query({ windowId })
            const tabIds = tabs
                .map(t => t.id)
                .filter((id): id is number => id !== undefined)
            await browserBg.tabs.ungroup(tabIds)
            return
        } catch (e) {
            logger.warning(`Failed to ungroup all tabs: ${e}`)
        }
    }

    return Promise.all([
        clearTgroups(),
        clearWindowTgroup(),
        browser.tabs.query({ currentWindow: true }).then(async tabs => {
            const ids = tabs.map(tab => tab.id)
            await browser.tabs.show(ids)
            return clearTabTgroup(ids)
        }),
    ])
}

/**
 * Set the tab's tab group to its window's active tab group if there is one.
 *
 * Do nothing if the tab is already associated with a tab group.
 *
 * @param tab The tab that was just created.
 *
 */
export async function tgroupHandleTabCreated(tab: browser.tabs.Tab) {
    const windowGroup = await windowTgroup(tab.windowId)

    if (windowGroup) {
        const tabGroup = await tabTgroup(tab.id)
        if (!tabGroup) {
            return setTabTgroup(windowGroup, tab.id)
        }
    }
}

/**
 * Set the tab's tab group to its window's active tab group if there is one.
 *
 * @param tabId The id of the tab that was just attached to this window.
 *
 */
export async function tgroupHandleTabAttached(tabId: number, attachInfo) {
    // NOTE this doesn't need to worry about a tab on another window previously
    // being pinned because tabs become unpinned when you move them between
    // windows
    const windowGroup = await windowTgroup(attachInfo.newWindowId)
    if (windowGroup) {
        return setTabTgroup(windowGroup, tabId)
    }
}

/**
 * Handle tab activation, possibly switching tab groups.
 *
 * If the new tab is from a different tab group, set it as the new tab group,
 * show all its tabs, and hide all tabs from the old tab group.
 */
export async function tgroupHandleTabActivated(activeInfo) {
    if (hasNativeTabGroups()) {
        return
    }

    const windowGroup = await windowTgroup(activeInfo.windowId)
    const tabGroup = await tabTgroup(activeInfo.tab)
    const promises = []
    if (windowGroup && tabGroup && windowGroup != tabGroup) {
        await setWindowTgroup(tabGroup, activeInfo.windowId)

        promises.push(
            tgroupTabs(tabGroup, false, activeInfo.windowId).then(tabs =>
                browserBg.tabs.show(tabs.map(tab => tab.id)),
            ),
        )
        promises.push(
            tgroupTabs(tabGroup, true, activeInfo.windowId).then(tabs =>
                browserBg.tabs.hide(tabs.map(tab => tab.id)),
            ),
        )
    }
    return Promise.all(promises)
}

/**
 * Set or clear a tab's group if it was pinned or unpinned respectively.
 *
 * @param tabId The id of the tab that was just updated.
 *
 */
export async function tgroupHandleTabUpdated(
    tabId: number,
    changeInfo,
    tab: browser.tabs.Tab,
) {
    if (changeInfo.pinned !== undefined) {
        const windowGroup = await windowTgroup(tab.windowId)
        if (windowGroup) {
            if (changeInfo.pinned) {
                return clearTabTgroup(tabId)
            } else {
                return setTabTgroup(windowGroup, tabId)
            }
        }
    }
}

/**
 * Handle the last tab in a tab group being closed.
 *
 * Clear its information.
 *
 */
export async function tgroupHandleTabRemoved(_tabId: number, removeInfo) {
    if (!removeInfo.isWindowClosing) {
        const windowGroup = await windowTgroup(removeInfo.windowId)
        const tabCount = await tgroupTabs(
            windowGroup,
            false,
            removeInfo.windowId,
        ).then(tabs => tabs.length)
        if (tabCount == 0) {
            return tgroupClearOldInfo(
                windowGroup,
                undefined,
                removeInfo.windowId,
            )
        }
    }
}

/**
 * Handle the last tab in a tab group being moved to another window.
 *
 * Clear its information.
 *
 */
export async function tgroupHandleTabDetached(tabId: number, detachInfo) {
    // clear tab's stored group; will automatically be changed if there are
    // groups on the other window but otherwise it will still show up in the
    // mode indicator
    clearTabTgroup(tabId)

    const windowGroup = await windowTgroup(detachInfo.oldWindowId)
    const tabCount = await tgroupTabs(
        windowGroup,
        false,
        detachInfo.oldWindowId,
    ).then(tabs => tabs.length)
    if (tabCount == 0) {
        return tgroupClearOldInfo(
            windowGroup,
            undefined,
            detachInfo.oldWindowId,
        )
    }
}

/**
 * Migrate legacy tab groups to native tab groups.
 * Only available when native tab groups API is present.
 */
export async function migrateToNativeGroups() {
    if (!hasNativeTabGroups()) {
        logger.warning("Native tab groups API not available, cannot migrate")
        return
    }

    logger.info("Starting migration of legacy tab groups to native groups...")

    const windowId = await activeWindowId()
    const legacyGroups = await browserBg.sessions.getWindowValue(
        windowId,
        "tridactyl-tgroups",
    )

    if (!legacyGroups || (legacyGroups as string[]).length === 0) {
        logger.info("No legacy tab groups to migrate")
        return
    }

    for (const groupName of legacyGroups as string[]) {
        try {
            const tabs = await browserBg.tabs.query({
                windowId,
                pinned: false,
            })

            const groupTabs = []
            for (const tab of tabs) {
                const tabGroup = await browserBg.sessions.getTabValue(
                    tab.id,
                    "tridactyl-tgroup",
                )
                if (tabGroup === groupName) {
                    groupTabs.push(tab.id)
                }
            }

            if (groupTabs.length > 0) {
                logger.info(
                    `Migrating group "${groupName}" with ${groupTabs.length} tabs`,
                )
                await setTabTgroup(groupName, groupTabs)
            }
        } catch (e) {
            logger.error(`Failed to migrate group "${groupName}": ${e}`)
        }
    }

    await browserBg.sessions.removeWindowValue(windowId, "tridactyl-tgroups")
    await browserBg.sessions.removeWindowValue(
        windowId,
        "tridactyl-active-tgroup",
    )

    logger.info("Migration complete")
}

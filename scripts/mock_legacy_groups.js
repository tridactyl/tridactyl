/**
 * Run this in the browser extension background console (about:debugging > Inspect > Console)
 * to create mock legacy tab group data for testing migrateToNativeGroups().
 *
 * Usage:
 *   1. Paste this script in the background console
 *   2. Run `migrate()` to test migration
 *   3. Run `cleanup()` to remove legacy data
 *   4. Run `ungroup()` to remove native groups (for re-testing)
 */

const GROUPS = ["work", "research", "personal"]

async function setup() {
    const win = await browser.windows.getCurrent({ populate: true })
    const windowId = win.id
    const tabs = win.tabs

    if (tabs.length < 2) {
        console.error("Need at least 2 tabs to test. Open more tabs and retry.")
        return
    }

    const assignments = tabs.map((tab, i) => ({
        tabId: tab.id,
        group: GROUPS[Math.min(Math.floor(i / 2), GROUPS.length - 1)],
    }))

    for (const { tabId, group } of assignments) {
        await browser.sessions.setTabValue(tabId, "tridactyl-tgroup", group)
    }

    const windowGroups = GROUPS.slice(0, Math.ceil(tabs.length / 2))
    await browser.sessions.setWindowValue(windowId, "tridactyl-tgroups", windowGroups)

    console.log("Mock legacy data created:")
    console.log("  Window groups:", windowGroups)
    for (const { tabId, group } of assignments) {
        const title = tabs.find(t => t.id === tabId)?.title ?? tabId
        console.log(`  Tab "${title}" -> ${group}`)
    }
    console.log('\nRun `migrate()` to test migration.')
}

async function cleanup() {
    const win = await browser.windows.getCurrent({ populate: true })

    await browser.sessions.removeWindowValue(win.id, "tridactyl-tgroups")
    await browser.sessions.removeWindowValue(win.id, "tridactyl-active-tgroup")

    for (const tab of win.tabs) {
        await browser.sessions.removeTabValue(tab.id, "tridactyl-tgroup")
    }

    console.log("Legacy mock data cleaned up.")
}

async function ungroup() {
    const win = await browser.windows.getCurrent()
    const groups = await browser.tabGroups.query({ windowId: win.id })
    for (const group of groups) {
        const tabs = await browser.tabs.query({ groupId: group.id })
        const tabIds = tabs.map(t => t.id)
        if (tabIds.length > 0) {
            await browser.tabs.ungroup(tabIds)
        }
    }
    console.log(`Removed ${groups.length} native tab groups.`)
}

async function migrate() {
    if (!browser.tabs.group || !browser.tabGroups) {
        console.error("Native tab groups API not available. Requires Firefox 137+.")
        return
    }

    console.log("Starting migration...")

    const windows = await browser.windows.getAll()
    let totalMigrated = 0

    for (const win of windows) {
        const windowId = win.id
        const legacyGroups = await browser.sessions.getWindowValue(
            windowId,
            "tridactyl-tgroups",
        )
        if (!legacyGroups || !Array.isArray(legacyGroups) || legacyGroups.length === 0) {
            continue
        }

        const tabs = await browser.tabs.query({ windowId })
        const tabGroupMap = new Map()

        for (const tab of tabs) {
            if (tab.id === undefined) continue
            const groupName = await browser.sessions.getTabValue(
                tab.id,
                "tridactyl-tgroup",
            )
            if (groupName && legacyGroups.includes(groupName)) {
                if (!tabGroupMap.has(groupName)) {
                    tabGroupMap.set(groupName, [])
                }
                tabGroupMap.get(groupName).push(tab.id)
            }
        }

        for (const [groupName, tabIds] of tabGroupMap) {
            if (tabIds.length === 0) continue
            try {
                const tempTab = await browser.tabs.create({ windowId, active: false })
                const groupId = await browser.tabs.group({
                    tabIds: [tempTab.id],
                    createProperties: { windowId },
                })
                await browser.tabGroups.update(groupId, { title: groupName })
                await browser.tabs.group({ tabIds, groupId })
                await browser.tabs.remove(tempTab.id)
                totalMigrated++
                console.log(`  Migrated "${groupName}" with ${tabIds.length} tabs`)
            } catch (e) {
                console.error(`  Failed to migrate "${groupName}": ${e}`)
            }
        }

        await browser.sessions.removeWindowValue(windowId, "tridactyl-tgroups")
        await browser.sessions.removeWindowValue(windowId, "tridactyl-active-tgroup")
    }

    const allTabs = await browser.tabs.query({})
    for (const tab of allTabs) {
        await browser.sessions.removeTabValue(tab.id, "tridactyl-tgroup")
    }

    console.log(`Migration complete. Migrated ${totalMigrated} groups.`)
}

setup()

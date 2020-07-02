import * as config from "@src/lib/config"
import * as ExtensionInfo from "@src/lib/extension_info"
import mergeDeep from "@src/lib/objects.ts"

async function _registerWithTST(manual = false) {
    try {
        await ExtensionInfo.messageExtension("tree_style_tab", {
            type: "register-self",
            name: "Tridactyl",
            icons: browser.runtime.getManifest().icons,
            listeningTypes: ["ready", "permissions-changed"],
            permissions: ["tabs"],
        })
    } catch (e) {
        if (manual)
            throw new Error("TreeStyleTab hasn't finished loading: " + e)
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
        if (
            message.type === "ready" ||
            message.type === "permissions-changed"
        ) {
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

export async function focusPrevVisible(increment = 1) {
    const alltabs = await getFlatTabs()
    const visibleTabs = alltabs.filter(t => !t.states.includes("collapsed"))
    const activeIdx = visibleTabs.findIndex(t => t.active)
    const prevVisibleIdx =
        (activeIdx - increment + visibleTabs.length) % visibleTabs.length
    const prevVisibleTabId = visibleTabs[prevVisibleIdx].id
    return browser.tabs.update(prevVisibleTabId, { active: true })
}

export async function focusNextVisible(increment = 1) {
    return focusPrevVisible(-increment)
}

export async function focusNextSibling(
    increment = 1,
    silently = false,
) {
    for (let i = 0; i < increment; ++i) {
        await ExtensionInfo.messageExtension("tree_style_tab", {
            type: "focus",
            tab: "nextSibling",
            silently,
        })
    }
}

export async function focusPrevSibling(
    increment = 1,
    silently = false,
) {
    // tslint:disable-next-line:no-unconditional-jump
    for (let i = 0; i < increment; ++i) {
        return await ExtensionInfo.messageExtension("tree_style_tab", {
            type: "focus",
            tab: "previousSibling",
            silently,
        })
    }
}

export async function focusAncestor(levels = 1) {
    const tab = await getTab("current")
    const ancestorIndent = Math.max(0, tab.indent - levels)
    const ancestorId =
        tab.ancestorTabIds[tab.ancestorTabIds.length - ancestorIndent - 1]
    return browser.tabs.update(ancestorId, { active: true })
}

export async function messageTSTTab(
    id: treestyletab.TabIdentifier,
    msg: "collapse-tree" | "expand-tree" | "indent" | "outdent",
    misc?,
) {
    const obj = {
        type: msg,
        tab: id,
    }
    return await ExtensionInfo.messageExtension(
        "tree_style_tab",
        mergeDeep(obj, misc),
    )
}

export async function collapseTree(id: treestyletab.TabIdentifier) {
    return await messageTSTTab(id, "collapse-tree")
}

export async function expandTree(id: treestyletab.TabIdentifier) {
    return await messageTSTTab(id, "expand-tree")
}

export async function indent(
    id: treestyletab.TabIdentifier,
    followChildren: boolean,
) {
    return await messageTSTTab(id, "indent", { followChildren })
}

export async function outdent(
    id: treestyletab.TabIdentifier,
    followChildren: boolean,
) {
    return await messageTSTTab(id, "outdent", { followChildren })
}

export async function getTab(
    id: treestyletab.TabIdentifier,
): Promise<treestyletab.Tab> {
    return ExtensionInfo.messageExtension("tree_style_tab", {
        type: "get-tree",
        tab: id,
    })
}

export async function getFlatTabs(): Promise<treestyletab.Tab[]> {
    return ExtensionInfo.messageExtension("tree_style_tab", {
        type: "get-tree",
        // Asking for tabs: '*' causes get-tree to return a flattened
        // array of every tab. Note that this causes parts of the tree
        // to be duplicated!
        tabs: "*",
    })
}

export function doTstIntegration(): boolean {
    // In order from fastest check to slowest - simple variable,
    // function call and map lookup, and finally complicated
    // config-state thing.
    return (
        REGISTERED &&
        ExtensionInfo.getExtensionEnabled("tree_style_tab") &&
        config.get("treestyletabintegration")
    )
}

// WARNING: module-level state!
let REGISTERED = false
registerWithTST()

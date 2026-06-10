import * as ExtensionInfo from "@src/lib/extension_info"
import { activeTab } from "@src/lib/webext"

export async function moveTreeBefore(tabId: number) {
    await ExtensionInfo.messageExtension("tree_style_tab", {
        type: "move-before",
        tab: "current",
        referenceTabId: tabId,
        followChildren: true,
    })
}

export async function moveTreeAfter(tabId: number) {
    await ExtensionInfo.messageExtension("tree_style_tab", {
        type: "move-after",
        tab: "current",
        referenceTabId: tabId,
        followChildren: true,
    })
}

export async function attachTree(parentTabId: number) {
    const currentTab = await activeTab()
    await ExtensionInfo.messageExtension("tree_style_tab", {
        type: "attach",
        child: currentTab.id,
        parent: parentTabId,
    })
}

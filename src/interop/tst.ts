import * as ExtensionInfo from "@src/lib/extension_info"

export async function moveTreeBefore(tabId: number) {
    await ExtensionInfo.messageExtension("tree_style_tab", {
        type: "move-before",
        tab: "current",
        referenceTabId: tabId,
        followChildren: true,
    })
}

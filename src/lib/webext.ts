import * as convert from "../convert"
import browserProxy from "./browser_proxy"
import * as config from "../config"

export function inContentScript() {
    return getContext() == "content"
}

/** WebExt code can be run from three contexts:

    Content script
    Extension page
    Background page
*/
export function getContext() {
    if (!("tabs" in browser)) {
        return "content"
    } else if (
        browser.runtime.getURL("_generated_background_page.html") ==
        window.location.href
    ) {
        return "background"
    } else {
        return "extension"
    }
}

export let browserBg

// Make this library work for both content and background.
if (inContentScript()) {
    browserBg = browserProxy
} else {
    browserBg = browser
}

/** The first active tab in the currentWindow.
 *
 * TODO: Highlander theory: Can there ever be more than one?
 *
 */
//#background_helper
export async function activeTab() {
    return (await browserBg.tabs.query({
        active: true,
        currentWindow: true,
    }))[0]
}

//#background_helper
export async function activeTabId() {
    return (await activeTab()).id
}

//#background_helper
export async function activeTabContainerId() {
    return (await activeTab()).cookieStoreId
}

//#background_helper
export async function activeTabContainer() {
    let containerId = await activeTabContainerId()
    if (containerId !== "firefox-default")
        return await browserBg.contextualIdentities.get(containerId)
    else
        throw new Error(
            "firefox-default is not a valid contextualIdentity (activeTabContainer)",
        )
}

/** Compare major firefox versions */
export async function firefoxVersionAtLeast(desiredmajor: number) {
    const versionstr = (await browserBg.runtime.getBrowserInfo()).version
    const actualmajor = convert.toNumber(versionstr.split(".")[0])
    return actualmajor >= desiredmajor
}

/** Simpler tabs.create option.

    If related = true && relatedopenpos = 'related' then open a new tab with
    some URL as if that URL had been middle clicked on the current tab. If
    relatedopenpos = 'next', open it as the next tab. If 'last', open it last
    and don't tell Firefox who opened it.

    Similarly for tabopenpos, but only tell FF that the newtab is related to
    the activeTab if tabopenpos == 'related'.

    i.e. place that tab just after the current tab and set openerTabId
*/
export async function openInNewTab(
    url: string,
    kwargs: { active?; related?; cookieStoreId? } = {
        active: true,
        related: false,
        cookieStoreId: undefined,
    },
) {
    const thisTab = await activeTab()
    const options: any = {
        active: kwargs.active,
        url,
        cookieStoreId: kwargs.cookieStoreId,
    }

    // Be nice to behrmann, #342
    let pos
    if (kwargs.related) pos = config.get("relatedopenpos")
    else pos = config.get("tabopenpos")
    switch (pos) {
        case "next":
            options.index = thisTab.index + 1
            if (kwargs.related && (await firefoxVersionAtLeast(57)))
                options.openerTabId = thisTab.id
            break
        case "last":
            // Infinity can't be serialised, apparently.
            options.index = (await browserBg.tabs.query({currentWindow: true})).length
            break
        case "related":
            if (await firefoxVersionAtLeast(57)) {
                options.openerTabId = thisTab.id
            } else {
                options.index = thisTab.index + 1
            }
            break
    }

    return browserBg.tabs.create(options)
}

// lazily copied from excmds.ts' winopen - forceURI really ought to be moved to lib/webext
// Should consider changing interface of this to match openInNewTab or vice versa
export async function openInNewWindow(createData = {}) {
    browserBg.windows.create(createData)
}

import * as convert from "@src/lib/convert"
import browserProxy, {
    CompatApis,
    compatProxy,
    desktopProxy,
    firefoxDesktopProxy,
    firefoxProxy,
    hasCapability,
} from "@src/lib/browser_proxy"
import * as config from "@src/lib/config"
import * as UrlUtil from "@src/lib/url_util"
import * as compat from "@src/lib/compat"
import { unwrapMessageResponse } from "@src/lib/message_response"
import { sleep } from "@src/lib/patience"
import * as R from "ramda"

export async function getSortedTabs(
    forceSort?: "mru" | "default",
    allWindows = false,
): Promise<browser.tabs.Tab[]> {
    const sortAlg = forceSort ?? config.get("tabsort")
    const comp =
        sortAlg === "mru"
            ? (a, b) =>
                  +a.active || -b.active || b.lastAccessed - a.lastAccessed
            : (a, b) => a.index - b.index
    const hiddenVal = config.get("tabshowhidden") === "true" ? undefined : false
    const query: Parameters<typeof browser.tabs.query>[0] = {
        hidden: hiddenVal,
    }
    if (!allWindows) {
        if (inContentScript()) query.windowId = (await ownTab()).windowId
        else query.currentWindow = true
    }
    return browserBg.tabs.query(query).then(tabs => tabs.sort(comp))
}

export function inContentScript() {
    return getContext() === "content"
}

export function getTriVersion() {
    return browser.runtime.getManifest().version
}

export function getTriVersionName() {
    const manifest = browser.runtime.getManifest()
    const versionName = (
        manifest as browser._manifest.WebExtensionManifest & {
            version_name?: string
        }
    ).version_name
    return versionName || manifest.version
}

export function getPrettyTriVersion() {
    const manifest = browser.runtime.getManifest()
    return manifest.name + " " + getTriVersionName()
}

export function notBackground() {
    return getContext() !== "background"
}

/** WebExt code can be run from three contexts:

    Content script
    Extension page
    Background page
*/
export function getContext() {
    if (!browser.tabs) {
        return "content"
    } else if (
        browser.runtime.getURL("_generated_background_page.html") ===
        window.location.href
    ) {
        return "background"
    } else {
        return "extension"
    }
}

// Make this library work for both content and background.
export const browserBg = inContentScript() ? browserProxy : browser
export const compatBg: CompatApis = inContentScript() ? compatProxy : compat
export const sessionsBg: typeof compat.sessions =
    getContext() === "background" ? compat.sessions : compatProxy.sessions

export function isAndroid() {
    if (!inContentScript()) return compat.isAndroid()
    return browserBg.runtime.getPlatformInfo().then(info => info.os === "android")
}

export async function getDesktopBg(): Promise<compat.DesktopCapability> {
    if (inContentScript())
        return (await hasCapability("desktop"))
            ? { kind: "desktop", api: desktopProxy() }
            : { kind: "unavailable" }
    return compat.getDesktop()
}

export async function requireDesktopBg(): Promise<compat.DesktopApis> {
    const capability = await getDesktopBg()
    if (capability.kind === "unavailable")
        return compat.unsupportedApi("This operation requires a desktop browser.")
    return capability.api
}

export async function getFirefoxBg(): Promise<compat.FirefoxCapability> {
    if (inContentScript())
        return (await hasCapability("firefox"))
            ? { kind: "firefox", api: firefoxProxy() }
            : { kind: "unavailable" }
    return compat.getFirefox()
}

export async function requireFirefoxBg(): Promise<compat.FirefoxApis> {
    const capability = await getFirefoxBg()
    if (capability.kind === "unavailable")
        return compat.unsupportedApi("This operation requires Firefox.")
    return capability.api
}

export async function getFirefoxDesktopBg(): Promise<compat.FirefoxDesktopCapability> {
    if (inContentScript())
        return (await hasCapability("firefoxDesktop"))
            ? { kind: "firefoxDesktop", api: firefoxDesktopProxy() }
            : { kind: "unavailable" }
    return compat.getFirefoxDesktop()
}

export async function requireFirefoxDesktopBg(): Promise<compat.FirefoxDesktopApis> {
    const capability = await getFirefoxDesktopBg()
    if (capability.kind === "unavailable")
        return compat.unsupportedApi("This operation requires Firefox desktop.")
    return capability.api
}

let lastAudibleTabId: number | undefined

export function initLastAudibleTabTracking() {
    browser.tabs.onUpdated.addListener(
        (tabId, changeInfo) => {
            if (changeInfo.audible === false) lastAudibleTabId = tabId
        },
    )
    browser.tabs.onRemoved.addListener(tabId => {
        if (tabId === lastAudibleTabId) lastAudibleTabId = undefined
    })
}
if (getContext() === "background") initLastAudibleTabTracking()
/** Return a currently audible tab, or the one that most recently stopped. */
export async function getLastAudibleTab() {
    const [tab] = await browserBg.tabs.query({ audible: true })
    if (tab || lastAudibleTabId === undefined) return tab
    return browserBg.tabs.get(lastAudibleTabId).catch(() => undefined)
}

/** The first active tab in the currentWindow.
 *
 * TODO: Highlander theory: Can there ever be more than one?
 *
 */
export async function activeTab() {
    if (inContentScript()) return ownTab()
    return (
        await browserBg.tabs.query({
            active: true,
            currentWindow: true,
        })
    )[0]
}

export async function activeTabOnWindow(windowId?: number) {
    return (
        await browser.tabs.query({
            windowId,
            active: true,
        })
    )[0]
}

export async function activeTabId() {
    return (await activeTab()).id
}

export async function prevActiveTab() {
    const query = inContentScript()
        ? { windowId: (await ownTab()).windowId }
        : { currentWindow: true }
    const tabs = (
        await browserBg.tabs.query(query)
    ).sort((a, b) => b.lastAccessed - a.lastAccessed)

    if (tabs.length > 1) return tabs[1]
    return tabs[0]
}

/**
 * Return the active window's id.
 *
 */
export async function activeWindowId() {
    if (inContentScript()) return (await ownTab()).windowId
    if (await isAndroid()) return (await activeTab()).windowId
    return (await (await requireDesktopBg()).windows.getCurrent()).id
}

export async function removeActiveWindowValue(value) {
    return sessionsBg.removeWindowValue(
        await activeWindowId(),
        value,
    )
}

export async function activeTabContainerId() {
    const tab = await activeTab()
    return "cookieStoreId" in tab && typeof tab.cookieStoreId === "string"
        ? tab.cookieStoreId
        : undefined
}

export async function ownTab() {
    // Warning: this relies on the owntab_background listener being set in messaging.ts in order to work
    return unwrapMessageResponse(
        browser.runtime.sendMessage({ type: "owntab_background" }),
    )
}

export async function ownTabId() {
    return (await ownTab()).id
}

async function windows() {
    return (await compatBg.windows.getAll())
        .map(w => w.id)
        .sort((a, b) => a - b)
}

/* Returns Tridactyl's window index. */
export async function ownWinTriIndex() {
    return (await windows()).indexOf((await ownTab()).windowId)
}

/* Returns mozilla's internal window id from Tridactyl's index. */
export async function getWinIdFromIndex(index: string) {
    return (await windows())[index]
}

export async function ownTabContainer() {
    return (await requireFirefoxDesktopBg()).contextualIdentities.get(
        (await ownTab()).cookieStoreId,
    )
}

export async function activeTabContainer() {
    const containerId = await activeTabContainerId()
    if (containerId !== "firefox-default")
        return (await requireFirefoxDesktopBg()).contextualIdentities.get(containerId)
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

    // NB: defaults are actually enforced just below
    kwargs: {
        active?
        related?
        cookieStoreId?
        bypassFocusHack?
        discarded?
        pinned?
        beforeNavigate?: (tabId: number) => void
    } = {
        active: true,
        related: false,
        cookieStoreId: undefined,
        bypassFocusHack: false,
        discarded: false,
        pinned: false,
    },

    waitForDOM = false,
) {
    // Ensure sensible defaults are used
    kwargs = R.mergeLeft(kwargs, {
        active: true,
        related: false,
        cookieStoreId: undefined,
        bypassFocusHack: false,
        discarded: false,
        pinned: false,
    })

    const thisTab = await activeTab()
    const delayedUrl = kwargs.beforeNavigate && !kwargs.discarded && url
    const options: compat.DesktopCreateProperties = {
        active: kwargs.bypassFocusHack,
        windowId: thisTab.windowId,
        url: delayedUrl ? "about:blank" : url,
        pinned: kwargs.pinned,
    }

    // Be nice to behrmann, #342
    let pos
    if (kwargs.related) pos = config.get("relatedopenpos")
    else pos = config.get("tabopenpos")
    switch (pos) {
        case "next":
            options.index = thisTab.index + 1
            if (kwargs.related) options.openerTabId = thisTab.id
            break
        case "last":
            // Infinity can't be serialised, apparently.
            options.index = (
                await browserBg.tabs.query({
                    windowId: thisTab.windowId,
                })
            ).length
            break
        case "related":
            options.openerTabId = thisTab.id
            break
    }

    const tabCreateWrapper = async options => {
        const android = await isAndroid()
        if (
            android &&
            (kwargs.cookieStoreId || kwargs.discarded || kwargs.pinned)
        )
            return compat.unsupportedApi(
                "Containers, discarded tabs, and pinned tabs are unavailable on Android.",
            )
        const needsFirefox =
            kwargs.cookieStoreId || kwargs.discarded || kwargs.beforeNavigate
        const firefoxDesktopTabs =
            !android && needsFirefox
                ? (await requireFirefoxDesktopBg()).tabs
                : undefined
        const desktopTabs =
            !android && !firefoxDesktopTabs
                ? (await requireDesktopBg()).tabs
                : undefined
        const tab = await (android
            ? browserBg.tabs.create({
                  active: options.active,
                  index: options.index,
                  url: options.url,
                  windowId: options.windowId,
              })
            : firefoxDesktopTabs
              ? firefoxDesktopTabs.create({
                    ...options,
                    cookieStoreId: kwargs.cookieStoreId,
                    discarded: kwargs.discarded,
                })
              : desktopTabs.create(options))
        let result = tab
        let listener
        const answer: Promise<browser.tabs.Tab> = new Promise(resolve => {
            // This can't run in content scripts, obviously
            // surely we never call this from a content script?
            if (waitForDOM) {
                listener = (message, sender) => {
                    if (
                        message === "dom_loaded_background" &&
                        sender?.tab?.id === tab.id &&
                        (!delayedUrl || sender?.url !== "about:blank")
                    ) {
                        browserBg.runtime.onMessage.removeListener(listener)
                        resolve(tab)
                    }
                }
                browserBg.runtime.onMessage.addListener(listener)
            } else {
                resolve(tab)
            }
        })
        if (kwargs.beforeNavigate) {
            kwargs.beforeNavigate(tab.id)
            if (delayedUrl)
                result = await (firefoxDesktopTabs
                    ? firefoxDesktopTabs.update(tab.id, {
                          url: delayedUrl,
                          loadReplace: true,
                      })
                    : browserBg.tabs.update(tab.id, { url: delayedUrl }))
        }
        // Return on slow- / extremely quick- loading pages anyway
        await Promise.race([
            answer,
            (async () => {
                await sleep(750)
                if (listener) browserBg.runtime.onMessage.removeListener(listener)
                return tab
            })(),
        ])
        return result
    }
    if (kwargs.active === false) {
        // load in background
        return tabCreateWrapper(options)
    } else {
        // load in background and then activate, per issue #1993
        return tabCreateWrapper(options).then(newtab =>
            browserBg.tabs.update(newtab.id, { active: true }),
        )
    }
}

// lazily copied from excmds.ts' winopen - forceURI really ought to be moved to lib/webext
// Should consider changing interface of this to match openInNewTab or vice versa
export async function openInNewWindow(
    createData: browser.windows._CreateCreateData = {},
) {
    if (await isAndroid())
        return compat.unsupportedApi("no windows on android")
    return (await requireDesktopBg()).windows.create(createData)
}

// Returns object if we should use the search engine instead
export async function queryAndURLwrangler(
    query: string[],
): Promise<string | { engine?: string; query: string }> {
    let address = query.join(" ")

    if (address === "") {
        address = config.get("newtab")
    }

    // Special ritual for about:newtab: we can access it but only if we don't ask for it
    if (address === "about:newtab") {
        return undefined
    }

    const index = address.indexOf(" ")
    let firstWord = address
    if (index > -1) firstWord = address.substr(0, index)

    if (firstWord === "") {
        // No query, no newtab set, the user is asking for Tridactyl's newtab page, which we deal with in :tabopen / :open directly
        return undefined
    }

    // Perhaps the user typed a URL?
    if (/^[a-zA-Z0-9+.-]+:[^\s:]/.test(address)) {
        try {
            return new URL(address).href
        } catch (e) {
            // Not a problem, we'll treat address as a regular search query
        }
    }

    // `+ 1` because we want to get rid of the space
    const rest = address.substr(firstWord.length + 1)

    const expandRecursively = (name, dict, prevExpansions = []) => {
        if (name in dict) {
            if (prevExpansions.includes(name)) {
                throw new Error(
                    `Infinite loop detected while expanding ${name}. Stack: ${prevExpansions}.`,
                )
            }
            prevExpansions.push(name)
            return expandRecursively(dict[name], dict, prevExpansions)
        }
        return name
    }

    const searchurls = config.get("searchurls")
    const template = expandRecursively(firstWord, searchurls)
    if (template != firstWord) {
        const url = UrlUtil.interpolateSearchItem(new URL(template), rest)
        // firstWord is a searchurl, so let's use that
        return url.href
    }

    const jsurls = config.get("jsurls")
    const js = expandRecursively(firstWord, jsurls)
    if (js != firstWord) {
        return eval(js)(rest)
    }

    const searchEngines = await compatBg.search.get()
    let engine = searchEngines.find(engine => engine.alias === firstWord)
    // Maybe firstWord is the name of a Firefox search engine?
    if (engine !== undefined) {
        return { engine: engine.name, query: rest }
    }

    // Maybe it's a host (ip, domain) without a protocol
    //
    // if the address looks like a number (e.g. 538, 3.14), then do *not* consider it as a potential
    // host (see #5081)
    // uses +str to first attempt parsing the address into a number, and then check whether the
    // result is NaN; this is required as Typescript, unlike JavaScript, only allows numbers as
    // arguments to NaN (see https://stackoverflow.com/q/42120046)
    if (isNaN(+address)) {
        try {
            const url = new URL("http://" + address)
            // Ignore unlikely domains
            if (
                // the endsWith check must be on address, because URL adds a
                // trailing slash which would always match
                address.endsWith("/") ||
                url.hostname.indexOf(".") > 0 ||
                url.port ||
                url.password
            ) {
                return url.href
            }
        } catch (e) {}
    }

    // Let's default to the user's search engine then

    // if firstWord is "search", remove it from the query.
    // This allows users to search for a URL or a word they defined as searchurl
    let queryString = address
    if (firstWord === "search") {
        queryString = rest
    }

    const enginename = config.get("searchengine")
    // firstWord is neither a searchurl nor a search engine, let's see if a search engine has been defined in Tridactyl
    if (enginename) {
        if (searchurls[enginename]) {
            const url = UrlUtil.interpolateSearchItem(
                new URL(searchurls[enginename]),
                queryString,
            )
            return url.href
        }

        engine = searchEngines.find(engine => engine.alias === enginename)
        if (engine !== undefined) {
            return { engine: engine.name, query: queryString }
        }
    }

    if (!searchEngines.length) {
        const fallbackName = enginename || "google"
        const fallback = searchurls[fallbackName]
        if (!fallback) {
            throw new Error(
                `Search API unavailable. Set searchengine to a searchurls entry.`,
            )
        }
        return UrlUtil.interpolateSearchItem(
            new URL(fallback),
            queryString,
        ).href
    }

    // No search engine has been defined in Tridactyl, let's use firefox's default search engine
    return { query: queryString }
}

export async function openInTab(
    tab,
    opts: { loadReplace?: boolean } = {},
    strarr: string[],
) {
    const update = async (url: string) => {
        const firefoxDesktop = opts.loadReplace
            ? inContentScript()
                ? await hasCapability("firefoxDesktop")
                : (await compat.getFirefoxDesktop()).kind === "firefoxDesktop"
            : false
        if (firefoxDesktop)
            return (await requireFirefoxDesktopBg()).tabs.update(tab.id, {
                url,
                loadReplace: true,
            })
        return browserBg.tabs.update(tab.id, { url })
    }
    const maybeURL = await queryAndURLwrangler(strarr)
    if (typeof maybeURL === "string") {
        return update(maybeURL)
    }
    if (!(await isAndroid()) && typeof maybeURL === "object") {
        const { search } = await requireFirefoxDesktopBg()
        return search.search({ tabId: tab.id, ...maybeURL })
    }

    // Fall back to our new tab page
    return update("/static/newtab.html")
}

/**
 * Set active the tab with tabId and focus the window it is located in.
 * @param tabId tab identifier
 */
export async function goToTab(tabId: number) {
    const tab = await browserBg.tabs.update(tabId, { active: true })
    if (!(await isAndroid())) {
        const { windows } = await requireDesktopBg()
        await windows.update(tab.windowId, { focused: true })
    }
    return tab
}

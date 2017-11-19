// '//#' is a start point for a simple text-replacement-type macro. See excmds_macros.py

// {{{ setup

import * as Messaging from "./messaging"
import {l} from './lib/webext'

//#content_omit_line
import * as CommandLineContent from "./commandline_content"
//#content_omit_line
import "./number.clamp"
//#content_helper
import * as SELF from "./excmds_content"
//#content_helper
Messaging.addListener('excmd_content', Messaging.attributeCaller(SELF))
/** Message excmds_content.ts in the active tab of the currentWindow */
//#background_helper
import {messageActiveTab} from './messaging'

//#background_helper
import "./number.mod"
//#background_helper
import state from "./state"
//#background_helper
import {ModeName} from './state'
//#background_helper
import * as keydown from "./keydown_background"
//#background_helper
import {activeTab, activeTabId} from './lib/webext'

/** @hidden */
//#background_helper
export const cmd_params = new Map<string, Map<string, string>>()

/** @hidden */
const SEARCH_URLS = new Map<string, string>([
    ["google","https://www.google.com/search?q="],
    ["googleuk","https://www.google.co.uk/search?q="],
    ["bing","https://www.bing.com/search?q="],
    ["duckduckgo","https://duckduckgo.com/?q="],
    ["yahoo","https://search.yahoo.com/search?p="],
    ["twitter","https://twitter.com/search?q="],
    ["wikipedia","https://en.wikipedia.org/wiki/"],
    ["youtube","https://www.youtube.com/results?search_query="],
    ["amazon","https://www.amazon.com/s/ref=nb_sb_noss?url=search-alias%3Daps&field-keywords="],
    ["amazonuk","https://www.amazon.co.uk/s/ref=nb_sb_noss?url=search-alias%3Daps&field-keywords="],
])

/** @hidden */
function hasScheme(uri: string) {
    return uri.match(/^(\w+):/)
}

/** If maybeURI doesn't have a schema, affix http:// */
/** @hidden */
function forceURI(maybeURI: string) {
    if (hasScheme(maybeURI)) {
        return maybeURI
    }

    let urlarr = maybeURI.split(" ")
    if (SEARCH_URLS.get(urlarr[0]) != null){
        return SEARCH_URLS.get(urlarr[0]) + urlarr.slice(1,urlarr.length).join(" ")
    } else if (urlarr[0].includes('.')) {
        return "http://" + maybeURI
    } else {
        return SEARCH_URLS.get("google") + maybeURI
    }
}

/** @hidden */
//#background_helper
function tabSetActive(id: number) {
    browser.tabs.update(id, {active: true})
}

// }}}

// {{{ PAGE CONTEXT

/** Blur (unfocus) the active element */
//#content
export function unfocus() {
    (document.activeElement as HTMLInputElement).blur()
}

//#content
export function scrollpx(a: number, b: number) {
    window.scrollBy(a, b)
}

/** If one argument is given, scroll to that percentage down the page.
    If two arguments are given, treat as x and y values to give to window.scrollTo
*/
//#content
export function scrollto(a: number, b?: number) {
    a = Number(a)
    // if b is undefined, Number(b) is NaN.
    b = Number(b)
    window.scrollTo(
        b ? a : window.scrollX,
        b
            ? b
            : a.clamp(0, 100) *
              (window.document.scrollingElement.scrollHeight / 100)
    )
}

//#content
export function scrollline(n = 1) {
    window.scrollByLines(n)
}
//#content
export function scrollpage(n = 1) {
    window.scrollBy(0, window.innerHeight * n)
}

/** @hidden */
//#content_helper
function history(n: number) {
    window.history.go(n)
}

//#content
export function forward(n = 1) {
    history(n)
}

//#content
export function back(n = 1) {
    history(n * -1)
}

/** Reload the next n tabs, starting with activeTab, possibly bypassingCache */
//#background
export async function reload(n = 1, hard = false) {
    let tabstoreload = await getnexttabs(await activeTabId(), n)
    let reloadProperties = {bypassCache: hard}
    tabstoreload.map(n => browser.tabs.reload(n, reloadProperties))
}

/** Reload the next n tabs, starting with activeTab. bypass cache for all */
//#background
export async function reloadhard(n = 1) {
    reload(n, true)
}

//#content
export function open(...urlarr: string[]) {
    let url = urlarr.join(" ")
    window.location.href = forceURI(url)
}

//#background
export function help(...urlarr: string[]) {
    let url = urlarr.join(" ")
    // window.location.href = "docs/modules/_excmds_.html#" + url
    browser.tabs.create({url: "static/docs/modules/_excmds_.html#" + url})

}

/** @hidden */
//#content_helper
function getlinks(){
    return document.getElementsByTagName('a')
}

/** Find a likely next/previous link and follow it */
//#content
export function clicknext(dir = "next"){
    let linkarray = Array.from(getlinks())
    let regarray = [/\bnext|^>$|^(>>|»)$|^(>|»)|(>|»)$|\bmore\b/i, /\bprev\b|\bprevious\b|^<$|^(<<|«)$|^(<|«)|(<|«)$/i]

    regarray = window.location.href.match(/rockpapershotgun/) ? [/newer/i,/older/i] : regarray
    let nextreg = (dir == "next") ? regarray[0] : regarray[1]

    // Might need to add more cases to this as we look at more sites
    let nextlinks = linkarray.filter((link) => (link.innerText.match(nextreg) || link.rel.match(nextreg)))

    // Use the last link that matches because next/prev buttons tend to be at the end of the page
    // whereas lots of blogs have "VIEW MORE" etc. plastered all over their pages.
    // Stops us from having to hardcode in RPS and reddit, for example.
    window.location.href = nextlinks.slice(-1)[0].href
}

//#background
export function zoom(level=0){
    level = level > 3 ? level / 100 : level
    browser.tabs.setZoom(level)
}

// }}}

// {{{ TABS

/** Switch to the next tab by index (position on tab bar), wrapping round.

    optional increment is number of tabs forwards to move.
 */
//#background
export async function tabnext(increment = 1) {
    // Get an array of tabs in the current window
    let current_window = await browser.windows.getCurrent()
    let tabs = await browser.tabs.query({windowId: current_window.id})

    // Derive the index we want
    let desiredIndex = ((await activeTab()).index + increment).mod(tabs.length)

    // Find and switch to the tab with that index
    let desiredTab = tabs.find((tab: any) => {
        return tab.index === desiredIndex
    })
    tabSetActive(desiredTab.id)
}

//#background
export function tabprev(increment = 1) {
    tabnext(increment * -1)
}

// TODO: address should default to some page to which we have access
//          and focus the location bar
//#background
export async function tabopen(...addressarr: string[]) {
    let uri
    let address = addressarr.join(' ')
    if (address != "") uri = forceURI(address)
    browser.tabs.create({url: uri})
}

//#background
export async function tabduplicate(id?: number){
    id = id ? id : (await activeTabId())
    browser.tabs.duplicate(id)
}

//#background
export async function tabdetach(id?: number){
    id = id ? id : (await activeTabId())
    browser.windows.create({tabId: id})
}

//#background
export async function tabclose(ids?: number[] | number) {
    if (ids !== undefined) {
        browser.tabs.remove(ids)
    } else {
        // Close the current tab
        browser.tabs.remove(await activeTabId())
    }
}

/** restore most recently closed tab in this window unless the most recently closed item was a window */
//#background
export async function undo(){
    const current_win_id : number = (await browser.windows.getCurrent()).id
    const sessions = await browser.sessions.getRecentlyClosed()

    // The first session object that's a window or a tab from this window. Or undefined if sessions is empty.
    let closed = sessions.find((s) => {
        return ('window' in s || s.tab && (s.tab.windowId == current_win_id))
    })
    if (closed) {
        if (closed.tab) {
            browser.sessions.restore(closed.tab.sessionId)
        }
        else if (closed.window) {
            browser.sessions.restore(closed.window.sessionId)
        }
    }
}

//#background
export async function tabmove(n?: string) {
    let aTab = await activeTab(),
        m: number
    if (!n) {
        browser.tabs.move(aTab.id, {index: -1})
        return
    } else if (n.startsWith("+") || n.startsWith("-")) {
        m = Math.max(0, Number(n) + aTab.index)
    } else m = Number(n)
    browser.tabs.move(aTab.id, {index: m})
}

//#background
export async function pin() {
    let aTab = await activeTab()
    browser.tabs.update(aTab.id, {pinned: !aTab.pinned})
}

// }}}

// {{{ WINDOWS

//#background
export async function winopen(...args: string[]) {
    let address: string
    const createData = {}
    if (args[0] === "-private") {
        createData["incognito"] = true
        address = args.slice(1,args.length).join(' ')
    } else address = args.join(' ')
    createData["url"] = address != "" ? forceURI(address) : null
    browser.windows.create(createData)
}

//#background
export async function winclose() {
    browser.windows.remove((await browser.windows.getCurrent()).id)
}


// It's unclear if this will leave a session that can be restored.
// We might have to do it ourselves.
//#background
export async function qall(){
    let windows = await browser.windows.getAll()
    windows.map((window) => browser.windows.remove(window.id))
}

// }}}

// {{{ MISC

/** Deprecated! */
//#background
export function suppress(preventDefault?: boolean, stopPropagation?: boolean) {
    mode("ignore")
}

//#background
export function mode(mode: ModeName) {
    state.mode = mode
}

//#background
export async function getnexttabs(tabid: number, n?: number) {
    const curIndex: number = (await browser.tabs.get(tabid)).index
    const tabs: browser.tabs.Tab[] = await browser.tabs.query({
        currentWindow: true,
    })
    const indexFilter = ((tab: browser.tabs.Tab) => {
        return (
            curIndex <= tab.index &&
            (n ? tab.index < curIndex + Number(n) : true)
        )
    }).bind(n)
    return tabs.filter(indexFilter).map((tab: browser.tabs.Tab) => {
        return tab.id
    })
}

// Moderately slow; should load in results as they arrive, perhaps
// Todo: allow jumping to buffers once they are found
// Consider adding to buffers with incremental search
//      maybe only if no other results in URL etc?
// Find out how to return context of each result
//#background
/* export async function findintabs(query: string) { */
/*     const tabs = await browser.tabs.query({currentWindow: true}) */
/*     console.log(query) */
/*     const findintab = async tab => */
/*         await browser.find.find(query, {tabId: tab.id}) */
/*     let results = [] */
/*     for (let tab of tabs) { */
/*         let result = await findintab(tab) */
/*         if (result.count > 0) { */
/*             results.push({tab, result}) */
/*         } */
/*     } */
/*     results.sort(r => r.result.count) */
/*     console.log(results) */
/*     return results */
/* } */

// }}}

// {{{ CMDLINE

//#background_helper
import * as controller from './controller'

/** Split the input on pipes (|) and treat each as it's own command.

    Workaround: this should clearly be in the parser
*/
//#background
export function composite(...cmds: string[]) {
    cmds = cmds.join(" ").split("|")
    cmds.forEach(controller.acceptExCmd)
}

// TODO: These two don't really make sense as excmds, they're internal things.
//#content
export function showcmdline() {
    CommandLineContent.show()
    CommandLineContent.focus()
}

//#content
export function hidecmdline() {
    CommandLineContent.hide()
    CommandLineContent.blur()
}

/** Set the current value of the commandline to string */
//#background
export function fillcmdline(...strarr: string[]) {
    let str = strarr.join(" ")
    showcmdline()
    messageActiveTab("commandline_frame", "fillcmdline", [str])
}

//#background
export function fillcmdline_notrail(...strarr: string[]) {
    let str = strarr.join(" ")
    let trailspace = false
    showcmdline()
    messageActiveTab("commandline_frame", "fillcmdline", [str, trailspace])
}

//#background
export async function current_url(...strarr: string[]){
    fillcmdline_notrail(...strarr, (await activeTab()).url)
}

//#background
export async function clipboard(excmd = "open", content = ""){
    let url = ""
    switch (excmd) {
        case 'yank':
            await messageActiveTab("commandline_content", "focus")
            content = (content == "") ? (await activeTab()).url : content
            messageActiveTab("commandline_frame", "setClipboard", [content])
            break
        case 'open':
            await messageActiveTab("commandline_content", "focus")
            url = await messageActiveTab("commandline_frame", "getClipboard")
            url && open(url)
            break
        case 'tabopen':
            await messageActiveTab("commandline_content", "focus")
            url = await messageActiveTab("commandline_frame", "getClipboard")
            url && tabopen(url)
            break
        default:
            // todo: maybe we should have some common error and error handler
            throw new Error(`[clipboard] unknown excmd: ${excmd}`)
    }
    hidecmdline()
}

// {{{ Buffer/completion stuff
// TODO: Move autocompletions out of excmds.

/** @hidden */
//#background_helper
const DEFAULT_FAVICON = browser.extension.getURL("static/defaultFavicon.svg")

/** Buffer + autocompletions */
//#background
export async function openbuffer() {
    fillcmdline("buffer")
    messageActiveTab("commandline_frame", "changecompletions", [await l(listTabs())])
    showcmdline()
}

/** Change active tab */
//#background
export async function buffer(n?: number | string) {
    if (!n || Number(n) == 0) return // Vimperator index starts at 1
    if (n === "#") {
        n =
            (await browser.tabs.query({currentWindow: true})).sort((a, b) => {
                return a.lastAccessed < b.lastAccessed ? 1 : -1
            })[1].index + 1
    }
    if (Number.isInteger(Number(n))) {
        tabSetActive(
            (await browser.tabs.query({
                currentWindow: true,
                index: Number(n) - 1,
            }))[0].id
        )
    // hacky search by url
    } else {
        let currtabs = await browser.tabs.query({currentWindow: true})
        // todo: choose best match
        tabSetActive(currtabs.filter((t)=> (t["url"].includes(String(n)) || t["title"].toLowerCase().includes(String(n).toLowerCase())))[0].id)
    }
}

/** List of tabs in window and the last active tab. */
/** @hidden */
//#background_helper
async function getTabs() {
    const tabs = await browser.tabs.query({currentWindow: true})
    const lastActive = tabs.sort((a, b) => {
        return a.lastAccessed < b.lastAccessed ? 1 : -1
    })[1]
    tabs.sort((a, b) => {
        return a.index < b.index ? -1 : 1
    })
    console.log(tabs)
    return [tabs, lastActive]
}

/** innerHTML for a single Tab's representation in autocompletion */
/** @hidden */
//#background_helper
function formatTab(tab: browser.tabs.Tab, prev?: boolean) {
    // This, like all this completion logic, needs to move.
    const tabline = window.document.createElement('div')
    tabline.className = "tabline"

    const prefix = window.document.createElement('span')
    if (tab.active) prefix.textContent += "%"
    else if (prev) prefix.textContent += "#"
    if (tab.pinned) prefix.textContent += "@"
    prefix.textContent = prefix.textContent.padEnd(2)
    tabline.appendChild(prefix)

    // TODO: Dynamically set favicon dimensions. Should be able to use em.
    const favicon = window.document.createElement('img')
    favicon.src = tab.favIconUrl ? tab.favIconUrl : DEFAULT_FAVICON
    tabline.appendChild(favicon)

    const titlespan = window.document.createElement('span')
    titlespan.textContent=`${tab.index + 1}: ${tab.title}`
    tabline.appendChild(titlespan)

    const url = window.document.createElement('a')
    url.className = 'url'
    url.href = tab.url
    url.text = tab.url
    url.target = '_blank'
    tabline.appendChild(url)

    console.log(tabline)
    return tabline.outerHTML
}

/** innerHTML for tab autocompletion div */
/** @hidden */
//#background_helper
async function listTabs() {
    let buffers: string = "",
        [tabs, lastActive] = await getTabs()
    for (let tab of tabs as Array<browser.tabs.Tab>) {
        buffers += tab === lastActive ? formatTab(tab, true) : formatTab(tab)
    }
    return buffers
}

// }}}

// }}}

// {{{ SETTINGS

//#background
export async function bind(key: string, ...bindarr: string[]){
    let exstring = bindarr.join(" ")
    let nmaps = (await browser.storage.sync.get("nmaps"))["nmaps"]
    nmaps = (nmaps == undefined) ? {} : nmaps
    nmaps[key] = exstring
    browser.storage.sync.set({nmaps})
}

//#background
export async function unbind(key: string){
    bind(key)
}

/* Currently, only resets key to default after extension is reloaded */
//#background
export async function reset(key: string){
    bind(key)
    let nmaps = (await browser.storage.sync.get("nmaps"))["nmaps"]
    nmaps = (nmaps == undefined) ? {} : nmaps
    delete nmaps[key]
    browser.storage.sync.set({nmaps})
}

// }}}

// {{{ HINTMODE

//#background_helper
import * as hinting from './hinting_background'

/** Hint a page. Pass -b as first argument to open hinted page in background. */
//#background
export function hint(option: string) {
    if (option === '-b') hinting.hintPageOpenInBackground()
    else hinting.hintPageSimple()
    mode('hint')
}


// }}}


// vim: tabstop=4 shiftwidth=4 expandtab

// '//#' is a start point for a simple text-replacement-type macro. See excmds_macros.py

// {{{ setup

//#content_omit_line
import * as CommandLineContent from "./commandline_content"
//#content_omit_line
import "./number.clamp"
//#content_omit_line
import * as Messaging from "./messaging"
//#content_helper
import * as SELF from "./excmds_content"

//#background_helper
import "./number.mod"
//#background_helper
import state from "./state"

//#background_helper
const cmd_params = new Map<string, Map<string, string>>()

function hasScheme(uri: string) {
    return uri.match(/^(\w+):/)
}

/** If maybeURI doesn't have a schema, affix http:// */
function forceURI(maybeURI: string) {
    if (hasScheme(maybeURI)) {
        return maybeURI
    } else {
        return "http://" + maybeURI
    }
}

/** The first active tab in the currentWindow.
 *
 * TODO: Highlander theory: Can there ever be more than one?
 *
 */
//#background_helper
async function activeTab() {
    return (await browser.tabs.query({active: true, currentWindow: true}))[0]
}

//#background_helper
async function activeTabID() {
    return (await activeTab()).id
}

/** Message excmds_content.ts in the active tab of the currentWindow */
//#background_helper
async function message( type: "excmd_content" | "commandline_frame", command: string, args?: any[]) {
    let message: Message = {
        type,
        command,
        args,
    }
    browser.tabs.sendMessage(await activeTabID(), message)
}

//#background_helper
function tabSetActive(id: number) {
    browser.tabs.update(id, {active: true})
}

//#content_helper
function handler(message: Message) {
    console.log(message)
    try {
        SELF[message.command](...message.args)
    } catch (e) {
        console.error(
            `Failed to execute excmd: ${message.command}(...${message.args})!`,
            e
        )
    }
}

//#content_omit_line
Messaging.addListener("excmd_content", handler)

// }}}

// {{{ PAGE CONTEXT

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
    window.scrollBy(0, n)
}

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
    let tabstoreload = await getnexttabs(await activeTabID(), n)
    let reloadProperties = {bypassCache: hard}
    tabstoreload.map(n => browser.tabs.reload(n, reloadProperties))
}

/** Reload the next n tabs, starting with activeTab. bypass cache for all */
//#background
export async function reloadhard(n = 1) {
    reload(n, true)
}

//#content
export function open(url: string) {
    window.location.href = forceURI(url)
}

/** Custom open. Remove later */
// Hard coded search but lack thereof was annoying
//#content
export function google(...query: string[]) {
    window.location.href = "https://www.google.co.uk/search?q=" + query.join("+")
}

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
    let desiredTab = tabs.filter((tab: any) => {
        return tab.index === desiredIndex
    })[0]
    tabSetActive(desiredTab.id)
}

//#background
export function tabprev(increment = 1) {
    tabnext(increment * -1)
}

// TODO: address should default to some page to which we have access
//          and focus the location bar
//#background
export async function tabopen(address?: string) {
    if (address) address = forceURI(address)
    browser.tabs.create({url: address})
}

//#background
export async function tabduplicate(id?: number){
    id = id ? id : (await activeTabID())
    browser.tabs.duplicate(id)
}

//#background
export async function tabdetach(id?: number){
    id = id ? id : (await activeTabID())
    browser.windows.create({tabId: id})
}

//#background
export async function tabclose(ids?: number[] | number) {
    if (ids !== undefined) {
        browser.tabs.remove(ids)
    } else {
        // Close the current tab
        browser.tabs.remove(await activeTabID())
    }
}

//#background
export async function undo(){
    let id = (await browser.sessions.getRecentlyClosed({maxResults: 1}))[0].id
    browser.sessions.restore(id)
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
        if (args[1]) address = args[1]
    } else if (args[0]) address = args[0]
    if (address)
        createData["url"] = forceURI(address)
    browser.windows.create(createData)
}

//#background
export async function winclose() {
    browser.windows.remove((await browser.windows.getCurrent()).id)
}

// }}}

// {{{ MISC

//#background
export function mode(mode: ModeType) {
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

// TODO: These two don't really make sense as excmds, they're internal things.
//#content
export function showcmdline() {
    CommandLineContent.show()
    /* CommandLineContent.focus() */
}

//#content
export function hidecmdline() {
    CommandLineContent.hide()
}

/* //#background */
/* export let focuscmdline = fillcmdline */

/** Set the current value of the commandline to string */
//#background
export function fillcmdline(str?: string) {
    showcmdline()
    message("commandline_frame", "fillcmdline", [str])
}

//#content
export function clipboard(excmd = "open"){
    let scratchpad = document.createElement("input")
    scratchpad.contentEditable = "true"
    document.documentElement.appendChild(scratchpad)
    if (excmd == "yank"){
        scratchpad.value = window.location.href
        scratchpad.select()
        document.execCommand("Copy")
        scratchpad.select()
    // open is broken - fails with Failed to execute excmd: clipboard(...open)! 
    } else if (excmd == "open"){
        scratchpad.focus()
        document.execCommand("Paste")
        let url = scratchpad.textContent
        console.log(url)
        open(url)
    }
    document.documentElement.removeChild(scratchpad)
    // let pastecontent = scratchpad.textContent
    // console.log(pastecontent)
}

//#content
export function resizecmdline() {
    CommandLineContent.resize()
}

// {{{ Buffer/completion stuff
// TODO: Move autocompletions out of excmds.

//#background_helper
const DEFAULT_FAVICON = browser.extension.getURL("static/defaultFavicon.svg")

/** Buffer + autocompletions */
//#background
export async function openbuffer() {
    fillcmdline("buffer")
    message("commandline_frame", "changecompletions", [await listTabs()])
    resizecmdline()
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
    tabSetActive(
        (await browser.tabs.query({
            currentWindow: true,
            index: Number(n) - 1,
        }))[0].id
    )
}

/** List of tabs in window and the last active tab. */
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
//#background_helper
function formatTab(tab: browser.tabs.Tab, prev?: boolean) {
    let formatted = `<div> `,
        url = `<div class="url">`
    if (tab.active) formatted += "%"
    else if (prev) formatted += "#"
    if (tab.pinned) formatted += "@"
    formatted = formatted.padEnd(9)
    // TODO: Dynamically set favicon dimensions.
    formatted += tab.favIconUrl
        ? `<img src="${tab.favIconUrl}" height="10px" width="10px"> `
        : `<img src="${DEFAULT_FAVICON}" height="10px" width="10px"> `
    formatted += `${tab.index + 1}: ${tab.title}`
    url += `<a href="${tab.url}" target="_blank">${tab.url}</a></div></div>`
    return formatted + url
}

/** innerHTML for tab autocompletion div */
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

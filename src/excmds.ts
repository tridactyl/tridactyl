// '//#' is a start point for a simple text-replacement-type macro. See excmds_macros.py

/** # Tridactyl help page

    Use `:help <excmd>` or scroll down to show [[help]] for a particular excmd.

    Tridactyl is in a pretty early stage of development. Please report any issues and make requests for missing features on the GitHub project page [[1]].

    Highlighted features:

    - Press `b` to bring up a list of open tabs in the current window; you can type the tab ID or part of the title or URL to choose a tab (the buffer list doesn't show which one you've selected yet, but it does work)
    - Press `I` to enter ignore mode. `Shift` + `Escape` to return to normal mode.
    - Press `f` to start "hint mode", `F` to open in background
    - Press `o` to `:open` a different page
    - Press `s` if you want to search for something that looks like a domain name or URL
    - [[bind]] new commands with e.g. `:bind J tabnext`
    - Type `:help` to see a list of available excmds
    - Use `yy` to copy the current page URL to your clipboard
    - `]]` and `[[` to navigate through the pages of comics, paginated articles, etc
    - Pressing `ZZ` will close all tabs and windows, but it will only "save" them if your about:preferences are set to "show your tabs and windows from last time"

    There are some caveats common to all webextension vimperator-alikes:

    - Do not try to navigate to any about:\* pages using `:open` as it will fail silently
    - Firefox will not load Tridactyl on addons.mozilla.org, about:\*, some file:\* URIs, view-source:\*, or data:\*. On these pages Ctrl-L (or F6), Ctrl-Tab and Ctrl-W are your escape hatches
    - Tridactyl does not currently support changing/hiding the Firefox GUI, but you can do it yourself by changing your userChrome. There is an example file available on our repository [[2]]

    If you want a more fully-featured vimperator-alike, your best option is Firefox ESR [[3]] and Vimperator :)

    [1]: https://github.com/cmcaine/tridactyl/issues
    [2]: https://github.com/cmcaine/tridactyl/blob/master/src/static/userChrome-minimal.css
    [3]: https://www.mozilla.org/en-US/firefox/organizations/

*/
/** ignore this line */

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
//#content_helper
import {incrementUrl, getUrlRoot, getUrlParent} from "./url_util"

/** @hidden */
//#background_helper
export const cmd_params = new Map<string, Map<string, string>>()

const SEARCH_URLS = new Map<string, string>([
    ["google","https://www.google.com/search?q="],
    ["googleuk","https://www.google.co.uk/search?q="],
    ["bing","https://www.bing.com/search?q="],
    ["duckduckgo","https://duckduckgo.com/?q="],
    ["yahoo","https://search.yahoo.com/search?p="],
    ["twitter","https://twitter.com/search?q="],
    ["wikipedia","https://en.wikipedia.org/wiki/Special:Search/"],
    ["youtube","https://www.youtube.com/results?search_query="],
    ["amazon","https://www.amazon.com/s/ref=nb_sb_noss?url=search-alias%3Daps&field-keywords="],
    ["amazonuk","https://www.amazon.co.uk/s/ref=nb_sb_noss?url=search-alias%3Daps&field-keywords="],
    ["startpage","https://www.startpage.com/do/search?query="],
])

/** @hidden */
function hasScheme(uri: string) {
    return uri.match(/^([\w-]+):/)
}

/** We use this over encodeURIComponent so that '+'s in non queries are not encoded. */
/** @hidden */
function searchURL(provider: string, query: string) {
    if (SEARCH_URLS.has(provider)) {
        const url = new URL(SEARCH_URLS.get(provider) + query)
        // URL constructor doesn't convert +s because they're valid literals in
        // the standard it adheres to. But they are special characters in
        // x-www-form-urlencoded and e.g. google excepts query parameters in
        // that format.
        url.search = url.search.replace(/\+/g, '%2B')
        return url
    } else {
        throw new TypeError(`Unknown provider: '${provider}'`)
    }
}

/** If maybeURI doesn't have a schema, affix http:// */
/** @hidden */
function forceURI(maybeURI: string): string {
    try {
        return new URL(maybeURI).href
    } catch (e) {
        if (e.name !== 'TypeError') throw e
    }

    // Else if search keyword:
    try {
        const args = maybeURI.split(' ')
        return searchURL(args[0], args.slice(1).join(' ')).href
    } catch (e) {
        console.log(e)
        if (e.name !== 'TypeError') throw e
    }

    // Else if it's a domain or something
    try {
        const url = new URL('http://' + maybeURI)
        // Ignore unlikely domains
        if (url.hostname.includes('.') || url.port || url.password) {
            return url.href
        }
    } catch (e) {
        if (e.name !== 'TypeError') throw e
    }

    // Else search google
    return searchURL('google', maybeURI).href
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

/** Navigate forward one page in history. */
//#content
export function forward(n = 1) {
    history(n)
}

/** Navigate back one page in history. */
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

/** Open a new page in the current tab.

    @param urlarr
        - if first word looks like it has a schema, treat as a URI
        - else if the first word contains a dot, treat as a domain name
        - else if the first word is a key of [[SEARCH_URLS]], treat all following terms as search parameters for that provider
        - else treat as search parameters for google
*/
//#content
export function open(...urlarr: string[]) {
    let url = urlarr.join(" ")
    window.location.href = forceURI(url)
}

/** Show this page.

    `:help <excmd>` jumps to the entry for that command.

    e.g. `:help bind`
*/
//#background
export async function help(excmd?: string) {
    const docpage = browser.extension.getURL("static/docs/modules/_excmds_.html#")
    if (excmd === undefined) excmd = "tridactyl-help-page"
    if ((await activeTab()).url.startsWith(docpage)) {
        open(docpage + excmd)
    } else {
        tabopen(docpage + excmd)
    }
}

/** @hidden */
//#content_helper
function getlinks(){
    return document.getElementsByTagName('a')
}

/** Find a likely next/previous link and follow it */
//#content
export function clicknext(dir: "next"|"prev" = "next"){
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

/** Increment the current tab URL
 *
 * @param count   the increment step, can be positive or negative
*/
//#content
export function urlincrement(count = 1){
    let newUrl = incrementUrl(window.location.href, count)

    if (newUrl !== null) {
        window.location.href = newUrl
    }
}

/** Go to the root domain of the current URL
 */
//#content
export function urlroot (){
    let rootUrl = getUrlRoot(window.location)

    if (rootUrl !== null) {
        window.location.href = rootUrl.href
    }
}

/** Go to the parent URL of the current tab's URL
 */
//#content
export function urlparent (){
    let parentUrl = getUrlParent(window.location)

    if (parentUrl !== null) {
        window.location.href = parentUrl.href
    }
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

/** Like [[open]], but in a new tab */
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

/** Pin the current tab */
//#background
export async function pin() {
    let aTab = await activeTab()
    browser.tabs.update(aTab.id, {pinned: !aTab.pinned})
}

// }}}

// {{{ WINDOWS

/** Like [[open]], but in a new window */
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


/** Close all windows */
// It's unclear if this will leave a session that can be restored.
// We might have to do it ourselves.
//#background
export async function qall(){
    let windows = await browser.windows.getAll()
    windows.map((window) => browser.windows.remove(window.id))
}

// }}}

// {{{ MISC

/** Deprecated */
//#background
export function suppress(preventDefault?: boolean, stopPropagation?: boolean) {
    mode("ignore")
}

/** Example:
        - `mode ignore` to ignore all keys.
*/
//#background
export function mode(mode: ModeName) {
    // TODO: event emition on mode change.
    if (mode === "hint") {
        hint()
    } else {
        state.mode = mode
    }
}

//#background_helper
async function getnexttabs(tabid: number, n?: number) {
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

/** Split `cmds` on pipes (|) and treat each as it's own command.

    Workaround: this should clearly be in the parser, but we haven't come up with a good way to deal with |s in URLs, search terms, etc. yet.
*/
//#background
export function composite(...cmds: string[]) {
    cmds = cmds.join(" ").split("|")
    cmds.forEach(controller.acceptExCmd)
}

/** Don't use this */
// TODO: These two don't really make sense as excmds, they're internal things.
//#content
export function showcmdline() {
    CommandLineContent.show()
    CommandLineContent.focus()
}

/** Don't use this */
//#content
export function hidecmdline() {
    CommandLineContent.hide()
    CommandLineContent.blur()
}

/** Set the current value of the commandline to string *with* a trailing space */
//#background
export function fillcmdline(...strarr: string[]) {
    let str = strarr.join(" ")
    showcmdline()
    messageActiveTab("commandline_frame", "fillcmdline", [str])
}

/** Set the current value of the commandline to string *without* a trailing space */
//#background
export function fillcmdline_notrail(...strarr: string[]) {
    let str = strarr.join(" ")
    let trailspace = false
    showcmdline()
    messageActiveTab("commandline_frame", "fillcmdline", [str, trailspace])
}

/** Equivalent to `fillcmdline_notrail <yourargs><current URL>`

    See also [[fillcmdline_notrail]]
*/
//#background
export async function current_url(...strarr: string[]){
    fillcmdline_notrail(...strarr, (await activeTab()).url)
}

/** Use the system clipboard.

    If `excmd == "open"`, call [[open]] with the contents of the clipboard. Similarly for [[tabopen]].

    If `excmd == "yank"`, copy the current URL, or if given, the value of toYank, into the system clipboard.

    Unfortunately, javascript can only give us the `clipboard` clipboard, not e.g. the X selection clipboard.

*/
//#background
export async function clipboard(excmd: "open"|"yank"|"tabopen" = "open", ...toYank: string[]) {
    let content = toYank.join(" ")
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
/** Ported from Vimperator. */
//#background
export async function tabs() {
    fillcmdline("buffer")
}
//#background
export async function buffers() {
    tabs()
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

/** Set tab with index of n belonging to window with id of m to active */
//#background
export async function bufferall(m?: number, n?: number) {
    // TODO
}

// }}}

// }}}

// {{{ SETTINGS

/** Bind a sequence of keys to an excmd.

    This is an easier-to-implement bodge while we work on vim-style maps.

    Examples:

        - `bind G fillcmdline tabopen google`
        - `bind D composite tabclose | tabprev`
        - `bind j scrollline 20`
        - `bind F hint -b`

    Use [[composite]] if you want to execute multiple excmds. Use
    [[fillcmdline]] to put a string in the cmdline and focus the cmdline
    (otherwise the string is executed immediately).

    See also:

        - [[unbind]]
        - [[reset]]
*/
//#background
export async function bind(key: string, ...bindarr: string[]){
    let exstring = bindarr.join(" ")
    let nmaps = (await browser.storage.sync.get("nmaps"))["nmaps"]
    nmaps = (nmaps == undefined) ? Object.create(null) : nmaps
    nmaps[key] = exstring
    browser.storage.sync.set({nmaps})
}

/** Unbind a sequence of keys so that they do nothing at all.

    See also:

        - [[bind]]
        - [[reset]]
*/
//#background
export async function unbind(key: string){
    bind(key, "")
}

/** Restores a sequence of keys to their default value.

    See also:

        - [[bind]]
        - [[unbind]]
*/
//#background
export async function reset(key: string){
    let nmaps = (await browser.storage.sync.get("nmaps"))["nmaps"]
    nmaps = (nmaps == undefined) ? {} : nmaps
    delete nmaps[key]
    browser.storage.sync.set({nmaps})
}

/** Bind a quickmark for the current URL to a key.

    Afterwards use go[key], gn[key], or gw[key] to [[open]], [[tabopen]], or
    [[winopen]] the URL respectively.
    
*/
//#background
export async function quickmark(key: string) {
    // ensure we're binding to a single key
    if (key.length !== 1) {
        return
    }

    let address = (await activeTab()).url
    // Have to await these or they race!
    await bind("gn" + key, "tabopen", address)
    await bind("go" + key, "open", address)
    await bind("gw" + key, "winopen", address)
}

// }}}

// {{{ HINTMODE

//#background_helper
import * as hinting from './hinting_background'

/** Hint a page. Pass -b as first argument to open hinted page in background. */
//#background
export function hint(option?: "-b") {
    if (option === '-b') hinting.hintPageOpenInBackground()
    else hinting.hintPageSimple()
}

// }}}

// {{{ GOBBLE mode

//#background_helper
import * as gobbleMode from './parsers/gobblemode'

/** Initialize gobble mode.

    It will read `nChars` input keys, append them to `endCmd` and execute that
    string.

*/
//#background
export async function gobble(nChars: number, endCmd: string) {
    gobbleMode.init(nChars, endCmd)
}

// }}}

// vim: tabstop=4 shiftwidth=4 expandtab

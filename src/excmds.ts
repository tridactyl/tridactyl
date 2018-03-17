// '//#' is a start point for a simple text-replacement-type macro. See excmds_macros.py

/** # Tridactyl help page

    Use `:help <excmd>` or scroll down to show [[help]] for a particular excmd.

    The default keybinds can be found [here](/static/docs/modules/_config_.html#defaults).
    You can also view them with [[bind]]. Try `bind j`.

    For more information, and FAQs, check out our [readme][4] on github.

    Tridactyl is in a pretty early stage of development. Please report any
    issues and make requests for missing features on the GitHub [project page][1].
    You can also get in touch using Matrix, Gitter, or IRC chat clients:

    [![Matrix Chat][matrix-badge]][matrix-link]
    [![Gitter Chat][gitter-badge]][gitter-link]
    [![Freenode Chat][freenode-badge]][freenode-link]

    All three channels are mirrored together, so it doesn't matter which one you use.

    ## Highlighted features:

    - Press `b` to bring up a list of open tabs in the current window; you can
      type the tab ID or part of the title or URL to choose a tab
    - Press `I` to enter ignore mode. `Shift` + `Escape` to return to normal
      mode.
    - Press `f` to start "hint mode", `F` to open in background
    - Press `o` to `:open` a different page
    - Press `s` if you want to search for something that looks like a domain
      name or URL
    - [[bind]] new commands with e.g. `:bind J tabnext`
    - Type `:help` to see a list of available excmds
    - Use `yy` to copy the current page URL to your clipboard
    - `]]` and `[[` to navigate through the pages of comics, paginated
      articles, etc
    - Pressing `ZZ` will close all tabs and windows, but it will only "save"
      them if your about:preferences are set to "show your tabs and windows
      from last time"

    There are some caveats common to all webextension vimperator-alikes:

    - Do not try to navigate to any about:\* pages using `:open` as it will
      fail silently
    - Firefox will not load Tridactyl on addons.mozilla.org, about:\*, some
      file:\* URIs, view-source:\*, or data:\*. On these pages Ctrl-L (or F6),
      Ctrl-Tab and Ctrl-W are your escape hatches
    - Tridactyl does not currently support changing/hiding the Firefox GUI, but
      you can do it yourself by changing your userChrome. There is an [example
      file](2) available in our repository.

    If you want a more fully-featured vimperator-alike, your best option is
    [Firefox ESR][3] and Vimperator :)

    [1]: https://github.com/cmcaine/tridactyl/issues
    [2]: https://github.com/cmcaine/tridactyl/blob/master/src/static/userChrome-minimal.css
    [3]: https://www.mozilla.org/en-US/firefox/organizations/
    [4]: https://github.com/cmcaine/tridactyl#readme

    [gitter-badge]: /static/badges/gitter-badge.svg
    [gitter-link]: https://gitter.im/tridactyl/Lobby
    [freenode-badge]: /static/badges/freenode-badge.svg
    [freenode-link]: ircs://chat.freenode.net/tridactyl
    [matrix-badge]: https://matrix.to/img/matrix-badge.svg
    [matrix-link]: https://riot.im/app/#/room/#tridactyl:matrix.org
*/
/** ignore this line */

// {{{ setup

// Shared
import * as Messaging from "./messaging"
import {l} from './lib/webext'
import state from "./state"
import * as UrlUtil from "./url_util"
import * as config from './config'
import * as aliases from './aliases'
import * as Logging from "./logging"
const logger = new Logging.Logger('excmds')

//#content_helper
// {
import "./number.clamp"
import * as SELF from "./excmds_content"
Messaging.addListener('excmd_content', Messaging.attributeCaller(SELF))
import * as DOM from './dom'
// }

//#background_helper
// {
/** Message excmds_content.ts in the active tab of the currentWindow */
import {messageActiveTab} from './messaging'

import "./number.mod"
import {ModeName} from './state'
import * as keydown from "./keydown_background"
import {activeTab, activeTabId, firefoxVersionAtLeast, openInNewTab} from './lib/webext'
import * as CommandLineBackground from './commandline_background'

/** @hidden */
export const cmd_params = new Map<string, Map<string, string>>()
// }

/** @hidden */
function hasScheme(uri: string) {
    return uri.match(/^([\w-]+):/)
}

/** @hidden */
function searchURL(provider: string, query: string) {
    if (provider == "search") provider = config.get("searchengine")
    const searchurlprovider = config.get("searchurls", provider)
    if (searchurlprovider === undefined){
        throw new TypeError(`Unknown provider: '${provider}'`)
    }

    return UrlUtil.interpolateSearchItem(new URL(searchurlprovider), query)
}

/** If maybeURI doesn't have a schema, affix http:// */
/** @hidden */
export function forceURI(maybeURI: string): string {
    // Need undefined to be able to open about:newtab
    if (maybeURI == "") return undefined
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

    // Else search $searchengine
    return searchURL('search', maybeURI).href
}

/** @hidden */
//#background_helper
function tabSetActive(id: number) {
    browser.tabs.update(id, {active: true})
}

// }}}

// {{{ INTERNAL/DEBUG

/**
 * Set the logging level for a given logging module.
 *
 * @param logModule     the logging module to set the level on
 * @param level         the level to log at: in increasing verbosity, one of
 *                      "never", "error", "warning", "info", "debug"
 */
//#background
export function loggingsetlevel(logModule: string, level: string) {
    const map = {
        "never": Logging.LEVEL.NEVER,
        "error": Logging.LEVEL.ERROR,
        "warning": Logging.LEVEL.WARNING,
        "info": Logging.LEVEL.INFO,
        "debug": Logging.LEVEL.DEBUG,
    }

    let newLevel = map[level.toLowerCase()]

    if (newLevel !== undefined) {
        config.set("logging", logModule, newLevel)
    } else {
        throw "Bad log level!"
    }
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

/** If two numbers are given, treat as x and y values to give to window.scrollTo
    If one number is given, scroll to that percentage along a chosen axis,
        defaulting to the y-axis
*/
//#content
export function scrollto(a: number, b: number | "x" | "y" = "y") {
    a = Number(a)
    if (b === "y") {
        window.scrollTo(
            window.scrollX,
            a.clamp(0, 100) * window.document.scrollingElement.scrollHeight / 100)
    }
    else if (b === "x") {
        window.scrollTo(
            a.clamp(0, 100) * window.document.scrollingElement.scrollWidth / 100,
            window.scrollY)
    } else {
        window.scrollTo(a, Number(b)) // a,b numbers
    }
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

/** Reloads all tabs, bypassing the cache if hard is set to true */
//#background
export async function reloadall(hard = false){
    let tabs = await browser.tabs.query({currentWindow: true})
    let reloadprops = {bypassCache: hard}
    tabs.map(tab => browser.tabs.reload(tab.id, reloadprops))
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

    Related settings:
        "searchengine": "google" or any of [[SEARCH_URLS]]
*/
//#content
export function open(...urlarr: string[]) {
    let url = urlarr.join(" ")
    if (url === "")
        url = config.get("newtab") || browser.extension.getURL("static/newtab.html")
    window.location.href = forceURI(url)
}

/** Go to your homepage(s)

    @param all
        - if "true", opens all homepages in new tabs
        - if "false" or not given, opens the last homepage in the current tab

*/
//#background
export function home(all: "false" | "true" = "false"){
    let homepages = config.get("homepages")
    if (homepages.length > 0){
        if (all === "false") open(homepages[homepages.length - 1])
        else {
            homepages.map(t=>tabopen(t))
        }
    }
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
// Find clickable next-page/previous-page links whose text matches the supplied pattern,
// and return the last such link.
//
// If no matching link is found, return undefined.
//
// We return the last link that matches because next/prev buttons tend to be at the end of the page
// whereas lots of blogs have "VIEW MORE" etc. plastered all over their pages.
//#content_helper
function findRelLink(pattern: RegExp): HTMLAnchorElement | null {
    // querySelectorAll returns a "non-live NodeList" which is just a shit array without working reverse() or find() calls, so convert it.
    const links = Array.from(
        <NodeListOf<HTMLAnchorElement>>document.querySelectorAll('a[href]'))

    // Find the last link that matches the test
    return links.reverse().find(link => pattern.test(link.innerText))

    // Note:
    // `innerText` gives better (i.e. less surprising) results than `textContent`
    // at the expense of being much slower, but that shouldn't be an issue here
    // as it's a one-off operation that's only performed when we're leaving a page
}

/** @hidden */
// Return the last element in the document matching the supplied selector,
// or null if there are no matches.
function selectLast(selector: string): HTMLElement | null {
    const nodes = <NodeListOf<HTMLElement>>document.querySelectorAll(selector)
    return nodes.length ? nodes[nodes.length - 1] : null
}

/** Find a likely next/previous link and follow it

    If a link or anchor element with rel=rel exists, use that, otherwise fall back to:
    
        1) find the last anchor on the page with innerText matching the appropriate `followpagepattern`.
        2) call [[urlincrement]] with 1 or -1

    If you want to support e.g. French:

    ```
    set followpagepatterns.next ^(next|newer|prochain)\b|»|>>
    set followpagepatterns.prev ^(prev(ious)?|older|précédent)\b|»|>>
    ```

    @param rel   the relation of the target page to the current page: "next" or "prev"
*/
//#content
export function followpage(rel: 'next'|'prev' = 'next') {
    const link = <HTMLLinkElement>selectLast(`link[rel~=${rel}][href]`)

    if (link) {
        window.location.href = link.href
        return
    }

    const anchor = <HTMLAnchorElement>selectLast(`a[rel~=${rel}][href]`) ||
        findRelLink(new RegExp(config.get("followpagepatterns", rel), "i"))

    if (anchor) {
        DOM.mouseEvent(anchor, "click")
    } else {
        urlincrement(rel === "next" ? 1 : -1)
    }
}

/** Increment the current tab URL
 *
 * @param count   the increment step, can be positive or negative
*/
//#content
export function urlincrement(count = 1){
    let newUrl = UrlUtil.incrementUrl(window.location.href, count)

    if (newUrl !== null) {
        window.location.href = newUrl
    }
}

/** Go to the root domain of the current URL
 */
//#content
export function urlroot (){
    let rootUrl = UrlUtil.getUrlRoot(window.location)

    if (rootUrl !== null) {
        window.location.href = rootUrl.href
    }
}

/** Go to the parent URL of the current tab's URL
 */
//#content
export function urlparent (count = 1){
    let parentUrl = UrlUtil.getUrlParent(window.location, count)

    if (parentUrl !== null) {
        window.location.href = parentUrl.href
    }
}

/**
 * Open a URL made by modifying the current URL
 *
 * There are several modes:
 *
 * * Text replace mode:   `urlmodify -t <old> <new>`
 *
 *   Replaces the first instance of the text `old` with `new`.
 *      * `http://example.com` -> (`-t exa peta`) -> `http://petample.com`
 *
 * * Regex replacment mode: `urlmodify -r <regexp> <new> [flags]`
 *
 *   Replaces the first match of the `regexp` with `new`. You can use
 *   flags `i` and `g` to match case-insensitively and to match
 *   all instances respectively
 *      * `http://example.com` -> (`-r [ea] X g`) -> `http://XxXmplX.com`
 *
 * * Query replace mode: `urlmodify -q <query> <new_val>`
 *
 *   Replace the value of a query with a new one:
 *      * `http://e.com?id=foo` -> (`-q id bar`) -> `http://e.com?id=bar
 *
 * * Query delete mode: `urlmodify -Q <query>`
 *
 *   Deletes the given query (and the value if any):
 *      * `http://e.com?id=foo&page=1` -> (`-Q id`) -> `http://e.com?page=1`
 *
 * * Graft mode: `urlmodify -g <graft_point> <new_path_tail>`
 *
 *   "Grafts" a new tail on the URL path, possibly removing some of the old
 *   tail. Graft point indicates where the old URL is truncated before adding
 *   the new path.
 *
 *   * `graft_point` >= 0 counts path levels, starting from the left
 *   (beginning). 0 will append from the "root", and no existing path will
 *   remain, 1 will keep one path level, and so on.
 *   * `graft_point` < 0 counts from the right (i.e. the end of the current
 *   path). -1 will append to the existing path, -2 will remove the last path
 *   level, and so on.
 *
 *   ```text
 *   http://website.com/this/is/the/path/component
 *   Graft point:       ^    ^  ^   ^    ^        ^
 *   From left:         0    1  2   3    4        5
 *   From right:       -6   -5 -4  -3   -2       -1
 *   ```
 *
 *   Examples:
 *
 *   * `http://e.com/issues/42` -> (`-g 0 foo`) -> `http://e.com/foo`
 *   * `http://e.com/issues/42` -> (`-g 1 foo`) -> `http://e.com/issues/foo`
 *   * `http://e.com/issues/42` -> (`-g -1 foo`) -> `http://e.com/issues/42/foo`
 *   * `http://e.com/issues/42` -> (`-g -2 foo`) -> `http://e.com/issues/foo`
 *
 * @param mode      The replace mode:
 *  * -t text replace
 *  * -r regexp replace
 *  * -q replace the value of the given query
 *  * -Q delete the given query
 *  * -g graft a new path onto URL or parent path of it
 * @param replacement the replacement arguments (depends on mode):
 *  * -t <old> <new>
 *  * -r <regexp> <new> [flags]
 *  * -q <query> <new_val>
 *  * -Q <query>
 *  * -g <graftPoint> <newPathTail>
 */
//#content
export function urlmodify(mode: "-t" | "-r" | "-q" | "-Q" | "-g", ...args: string[]) {

    let oldUrl = new URL(window.location.href)
    let newUrl = undefined

    switch(mode) {

        case "-t":
            if (args.length !== 2) {
                throw new Error("Text replacement needs 2 arguments:"
                    + "<old> <new>")
            }

            newUrl = oldUrl.href.replace(args[0], args[1])
            break

        case "-r":
            if (args.length < 2 || args.length > 3) {
                throw new Error("RegExp replacement takes 2 or 3 arguments: "
                    + "<regexp> <new> [flags]")
            }

            if (args[2] && args[2].search(/^[gi]+$/) === -1)
            {
                throw new Error("RegExp replacement flags can only include 'g', 'i'"
                    + ", Got '" + args[2] + "'")
            }

            let regexp = new RegExp(args[0], args[2])
            newUrl = oldUrl.href.replace(regexp, args[1])
            break

        case "-q":
            if (args.length !== 2) {
                throw new Error("Query replacement needs 2 arguments:"
                    + "<query> <new_val>")
            }

            newUrl = UrlUtil.replaceQueryValue(oldUrl, args[0],
                args[1])
            break
        case "-Q":
            if (args.length !== 1) {
                throw new Error("Query deletion needs 1 argument:"
                    + "<query>")
            }

            newUrl = UrlUtil.deleteQuery(oldUrl, args[0])
            break

        case "-g":
            if (args.length !== 2) {
                throw new Error("URL path grafting needs 2 arguments:"
                    + "<graft point> <new path tail>")
            }

            newUrl = UrlUtil.graftUrlPath(oldUrl, args[1], Number(args[0]))
            break
    }

    if (newUrl && newUrl !== oldUrl) {
        window.location.href = newUrl
    }
}

/** Returns the url of links that have a matching rel.

    Don't bind to this: it's an internal function.

    @hidden
 */
//#content
export function geturlsforlinks(reltype = "rel", rel: string){
    let elems = document.querySelectorAll("link[" + reltype + "='" + rel + "']") as NodeListOf<HTMLLinkElement>
    if (elems)
        return Array.prototype.map.call(elems, x => x.href)
    return []
}

//#background
export async function zoom(level=0, rel="false"){
    level = level > 3 ? level / 100 : level
    if(rel=="true") level += (await browser.tabs.getZoom())
    browser.tabs.setZoom(level)
}

//#background
export async function reader() {
    if (await l(firefoxVersionAtLeast(58))) {
    let aTab = await activeTab()
    if (aTab.isArticle) {
        browser.tabs.toggleReaderMode()
    } // else {
    //  // once a statusbar exists an error can be displayed there
    // }
    }
}

//@hidden
//#content_helper
loadaucmds()

//@hidden
//#content
export async function loadaucmds(){
    console.log("AUCMDS TRIED TO RUN")
    // for some reason, this never changes from the default, even when there is user config (e.g. set via `aucmd bbc.co.uk mode ignore`)
    let aucmds = await config.getAsync("autocmds", "DocStart")
    console.log(aucmds)
    const ausites = Object.keys(aucmds)
    // yes, this is lazy
    const aukey = ausites.find(e=>window.document.location.href.includes(e))
    if (aukey !== undefined){
        console.log(aukey)
        Messaging.message("commandline_background", "recvExStr", [aucmds[aukey]])
    }
}

/** The kinds of input elements that we want to be included in the "focusinput"
 * command (gi)
 */
export const INPUTTAGS_selectors = `
input:not([disabled]):not([readonly]):-moz-any(
 :not([type]),
 [type='text'],
 [type='search'],
 [type='password'],
 [type='datetime'],
 [type='datetime-local'],
 [type='date'],
 [type='month'],
 [type='time'],
 [type='week'],
 [type='number'],
 [type='range'],
 [type='email'],
 [type='url'],
 [type='tel'],
 [type='color']
),
textarea:not([disabled]):not([readonly]),
object,
[role='application']
`

/** Password field selectors */
const INPUTPASSWORD_selectors = `
input[type='password']
`

/** DOM reference to the last used Input field
 */
//#content_helper
let LAST_USED_INPUT: HTMLElement = null


/** Focus the last used input on the page
 *
 * @param nth   focus the nth input on the page, or "special" inputs:
 *                  "-l": last focussed input
 *                  "-n": input after last focussed one
 *                  "-N": input before last focussed one
 *                  "-p": first password field
 *                  "-b": biggest input field
 */
//#content
export function focusinput(nth: number|string) {

    let inputToFocus: HTMLElement = null

    // set to false to avoid falling back on the first available input
    // if a special finder fails
    let fallbackToNumeric = true

    // nth = "-l" -> use the last used input for this page
    if (nth === "-l") {
        // try to recover the last used input stored as a
        // DOM node, which should be exactly the one used before (or null)
        if (LAST_USED_INPUT) {
            inputToFocus = LAST_USED_INPUT
        } else {
            // Pick the first input in the DOM.
            inputToFocus = DOM.getElemsBySelector(INPUTTAGS_selectors,
                [DOM.isSubstantial])[0] as HTMLElement

            // We could try to save the last used element on page exit, but
            // that seems like a lot of faff for little gain.
        }
    }
    else if (nth === "-n" || nth === "-N") {
        // attempt to find next/previous input
        let inputs = DOM.getElemsBySelector(INPUTTAGS_selectors,
            [DOM.isSubstantial]) as HTMLElement[]
        if (inputs.length) {
            let index = inputs.indexOf(LAST_USED_INPUT)
            if (LAST_USED_INPUT) {
                if (nth === "-n") {
                    index++
                } else {
                    index--
                }
                index = index.mod(inputs.length)
            } else {
                index = 0
            }
            inputToFocus = inputs[index]
        }
    }
    else if (nth === "-p") {
        // attempt to find a password input
        fallbackToNumeric = false

        let inputs = DOM.getElemsBySelector(INPUTPASSWORD_selectors,
                                            [DOM.isSubstantial])

        if (inputs.length) {
            inputToFocus = <HTMLElement>inputs[0]
        }
    }
    else if (nth === "-b") {

        let inputs = DOM.getElemsBySelector(INPUTTAGS_selectors,
            [DOM.isSubstantial]) as HTMLElement[]

        inputToFocus = inputs.sort(DOM.compareElementArea).slice(-1)[0]
    }

    // either a number (not special) or we failed to find a special input when
    // asked and falling back is acceptable
    if (!inputToFocus  && fallbackToNumeric) {

        let index = isNaN(<number>nth) ? 0 : <number>nth
        inputToFocus = DOM.getNthElement(INPUTTAGS_selectors,
                                         index, [DOM.isSubstantial])
    }

    if (inputToFocus) {
        inputToFocus.focus()
        if (config.get('gimode') === 'nextinput' && state.mode !== 'input') {
            state.mode = 'input'
        }
    }

}

// Store the last focused element
//#content_helper
document.addEventListener("focusin",e=>{if (DOM.isTextEditable(e.target as HTMLElement)) LAST_USED_INPUT = e.target as HTMLElement})

// }}}

// {{{ TABS

/** Switch to the tab by index (position on tab bar), wrapping round.

    @param index
        1-based index of the tab to target. Wraps such that 0 = last tab, -1 =
        penultimate tab, etc.

        if undefined, return activeTabId()
*/
/** @hidden */
//#background_helper
async function tabIndexSetActive(index: number) {
    tabSetActive(await idFromIndex(index))
}

/** Switch to the next tab, wrapping round.

    If increment is specified, move that many tabs forwards.
 */
//#background
export async function tabnext(increment = 1) {
    tabIndexSetActive((await activeTab()).index + increment + 1)
}

/** Switch to the next tab, wrapping round.

    If an index is specified, go to the tab with that number (this mimics the
    behaviour of `{count}gt` in vim, except that this command will accept a
    count that is out of bounds (and will mod it so that it is within bounds as
    per [[tabmove]], etc)).
 */
//#background
export async function tabnext_gt(index?: number) {
    if (index === undefined) {
        tabnext()
    } else {
        tabIndexSetActive(index)
    }
}

/** Switch to the previous tab, wrapping round.

    If increment is specified, move that many tabs backwards.
 */
//#background
export async function tabprev(increment = 1) {
    tabIndexSetActive((await activeTab()).index - increment + 1)
}

/** Switch to the first tab. */
//#background
export async function tabfirst() {
    tabIndexSetActive(1)
}

/** Switch to the last tab. */
//#background
export async function tablast() {
    tabIndexSetActive(0)
}

/** Like [[open]], but in a new tab. If no address is given, it will open the newtab page, which can be set with `set newtab [url]`

    Unlike Firefox's Ctrl-t shortcut, this opens tabs immediately after the
    currently active tab rather than at the end of the tab list because that is
    the author's preference.

    If you would rather the Firefox behaviour `set tabopenpos last`. This
    preference also affects the clipboard, quickmarks, home, help, etc.

    If you would rather the URL be opened as if you'd middle clicked it, `set
    tabopenpos related`.

    Hinting is controlled by `relatedopenlast`

*/
//#background
export async function tabopen(...addressarr: string[]) {
    let url: string
    let address = addressarr.join(' ')

    if (address != "") url = forceURI(address)
    else url = forceURI(config.get("newtab"))

    openInNewTab(url)
}

/** Resolve a tab index to the tab id of the corresponding tab in this window.

    @param index
        1-based index of the tab to target. Wraps such that 0 = last tab, -1 =
        penultimate tab, etc.

        if undefined, return activeTabId()

    @hidden
*/
//#background_helper
async function idFromIndex(index?: number): Promise<number> {
    if (index !== undefined) {
        // Wrap
        index = (index - 1).mod(
            (await l(browser.tabs.query({currentWindow: true}))).length)
            + 1

        // Return id of tab with that index.
        return (await l(browser.tabs.query({
            currentWindow: true,
            index: index - 1,
        })))[0].id
    } else {
        return await activeTabId()
    }
}

/** Close all other tabs in this window */
//#background
export async function tabonly() {
    const tabs = await browser.tabs.query({
        pinned: false,
        active: false,
        currentWindow: true
    })
    const tabsIds = tabs.map(tab => tab.id)
    browser.tabs.remove(tabsIds)
}


/** Duplicate a tab.

    @param index
        The 1-based index of the tab to target. index < 1 wraps. If omitted, this tab.
*/
//#background
export async function tabduplicate(index?: number) {
    browser.tabs.duplicate(await idFromIndex(index))
}

/** Detach a tab, opening it in a new window.

    @param index
        The 1-based index of the tab to target. index < 1 wraps. If omitted, this tab.
*/
//#background
export async function tabdetach(index?: number) {
    browser.windows.create({tabId: await idFromIndex(index)})
}

/** Close a tab.

    Known bug: autocompletion will make it impossible to close more than one tab at once if the list of numbers looks enough like an open tab's title or URL.

    @param indexes
        The 1-based indexes of the tabs to target. indexes < 1 wrap. If omitted, this tab.
*/
//#background
export async function tabclose(...indexes: string[]) {
    if (indexes.length > 0) {
        const idsPromise = indexes.map(index => idFromIndex(Number(index)))
        browser.tabs.remove(await Promise.all(idsPromise))
    } else {
        // Close current tab
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

/** Synonym for [[tabclose]]. */
//#background
export async function quit() {
    tabclose()
}

/** Convenience shortcut for [[quit]]. */
//#background
export async function q() {
    tabclose()
}

/** Move the current tab to be just in front of the index specified.

    Known bug: This supports relative movement, but autocomple doesn't know
    that yet and will override positive and negative indexes.

    Put a space in front of tabmove if you want to disable completion and have
    the relative indexes at the command line.

    Binds are unaffected.

    @param index
        New index for the current tab.

        1 is the first index. 0 is the last index. -1 is the penultimate, etc.
*/
//#background
export async function tabmove(index = "0") {
    const aTab = await activeTab()
    let newindex: number
    if (index.startsWith("+") || index.startsWith("-")) {
        newindex = Math.max(0, Number(index) + aTab.index)
    } else newindex = Number(index) - 1
    browser.tabs.move(aTab.id, {index: newindex})
}

/** Pin the current tab */
//#background
export async function pin() {
    let aTab = await activeTab()
    browser.tabs.update(aTab.id, {pinned: !aTab.pinned})
}

// }}}

// {{{ WINDOWS

/** Like [[tabopen]], but in a new window */
//#background
export async function winopen(...args: string[]) {
    let address: string
    const createData = {}
    if (args[0] === "-private") {
        createData["incognito"] = true
        address = args.slice(1,args.length).join(' ')
    } else address = args.join(' ')
    createData["url"] = address != "" ? forceURI(address) : forceURI(config.get("newtab"))
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

/** Convenience shortcut for [[qall]]. */
//#background
export async function qa() {
    qall()
}

// }}}

// {{{ MISC

/** Deprecated */
//#background
export function suppress(preventDefault?: boolean, stopPropagation?: boolean) {
    mode("ignore")
}

//#background
export function version(){
    fillcmdline_notrail("REPLACE_ME_WITH_THE_VERSION_USING_SED")
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

/** Repeats a `cmd` `n` times.
    Falls back to the last executed command if `cmd` doesn't exist.
    Executes the command once if `n` isn't defined either.
*/
//#background
export function repeat(n = 1, ...exstr: string[]) {
    let cmd = state.last_ex_str
    if (exstr.length > 0)
        cmd = exstr.join(" ")
    logger.debug("repeating " + cmd + " " + n + " times")
    for (let i = 0; i < n; i++)
        controller.acceptExCmd(cmd)
}

/** Split `cmds` on pipes (|) and treat each as it's own command.

    Workaround: this should clearly be in the parser, but we haven't come up with a good way to deal with |s in URLs, search terms, etc. yet.
*/
//#background
export function composite(...cmds: string[]) {
    cmds = cmds.join(" ").split("|")
    cmds.forEach(controller.acceptExCmd)
}

/** Please use fillcmdline instead */
//#background
function showcmdline() {
    CommandLineBackground.show()
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

    If `excmd == "yankcanon"`, copy the canonical URL of the current page if it exists, otherwise copy the current URL.

    If `excmd == "yankshort"`, copy the shortlink version of the current URL, and fall back to the canonical then actual URL. Known to work on https://yankshort.neocities.org/.

    Unfortunately, javascript can only give us the `clipboard` clipboard, not e.g. the X selection clipboard.

*/
//#background
export async function clipboard(excmd: "open"|"yank"|"yankshort"|"yankcanon"|"tabopen" = "open", ...toYank: string[]) {
    let content = toYank.join(" ")
    let url = ""
    let urls = []
    switch (excmd) {
        case 'yankshort':
            urls = await geturlsforlinks("rel", "shortlink")
            if (urls.length == 0) {
                urls = await geturlsforlinks("rev", "canonical")
            }
            if (urls.length > 0) {
                messageActiveTab("commandline_frame", "setClipboard", [urls[0]])
                break
            }
        case 'yankcanon':
            urls = await geturlsforlinks("rel", "canonical")
            if (urls.length > 0) {
                messageActiveTab("commandline_frame", "setClipboard", [urls[0]])
                break
            }
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
    CommandLineBackground.hide()
}

// {{{ Buffer/completion stuff

/** Equivalent to `fillcmdline buffer`

    Sort of Vimperator alias
*/
//#background
export async function tabs() {
    fillcmdline("buffer")
}

/** Equivalent to `fillcmdline buffer`

    Sort of Vimperator alias
*/
//#background
export async function buffers() {
    tabs()
}

/** Change active tab.

    @param index
        Starts at 1. 0 refers to last tab, -1 to penultimate tab, etc.

        "#" means the tab that was last accessed in this window
 */
//#background
export async function buffer(index: number | '#') {
    if (index === "#") {
        // Switch to the most recently accessed buffer
        tabIndexSetActive(
            (await browser.tabs.query({currentWindow: true})).sort((a, b) => {
                return a.lastAccessed < b.lastAccessed ? 1 : -1
            })[1].index + 1
        )
    } else if (Number.isInteger(Number(index))) {
        tabIndexSetActive(Number(index))
    }
}

// }}}

// }}}

// {{{ SETTINGS

/**
 * Similar to vim's `:command`. Maps one ex-mode command to another.
 * If command already exists, this will override it, and any new commands
 * added in a future release will be SILENTLY overridden. Aliases are
 * expanded recursively.
 *
 * Examples:
 *  - `command t tabopen`
 *  - `command tn tabnext_gt`
 *  = `command hello t` This will expand recursively into 'hello'->'tabopen'
 *
 * Note that this is only for excmd->excmd mappings. To map a normal-mode
 * command to an excommand, see [[bind]].
 *
 * See also:
 *  - [[comclear]]
 */
//#background
export function command(name: string, ...definition: string[]) {
    // Test if alias creates an alias loop.
    try {
        const def = definition.join(" ")
        // Set alias
        config.set("exaliases", name, def)
        aliases.expandExstr(name)
    } catch(e) {
        // Warn user about infinite loops
        fillcmdline_notrail(e, ' Alias unset.')
        config.unset("exaliases", name)
    }
}

/**
 * Similar to vim's `comclear` command. Clears an excmd alias defined by
 * `command`.
 *
 * For example: `comclear helloworld` will reverse any changes caused
 * by `command helloworld xxx`
 *
 * See also:
 *  - [[command]]
 */
//#background
export function comclear(name: string) {
    config.unset("exaliases", name)
}

/** Bind a sequence of keys to an excmd or view bound sequence.

    This is an easier-to-implement bodge while we work on vim-style maps.

    Examples:

        - `bind G fillcmdline tabopen google`
        - `bind D composite tabclose | buffer #`
        - `bind j scrollline 20`
        - `bind F hint -b`

    You can view binds by omitting the command line:

        - `bind j`
        - `bind k`

    Use [[composite]] if you want to execute multiple excmds. Use
    [[fillcmdline]] to put a string in the cmdline and focus the cmdline
    (otherwise the string is executed immediately).

    See also:

        - [[unbind]]
        - [[reset]]
*/
//#background
export function bind(key: string, ...bindarr: string[]){
    if (bindarr.length) {
        let exstring = bindarr.join(" ")
        config.set("nmaps", key, exstring)
    } else if (key.length) {
        // Display the existing bind
        fillcmdline_notrail("#", key, "=", config.get("nmaps", key))
    }
}

/**
 * Set a search engine keyword for use with *open or `set searchengine`
 *
 * @deprecated use `set searchurls.KEYWORD URL` instead
 *
 * @param keyword   the keyword to use for this search (e.g. 'esa')
 * @param url       the URL to interpolate the query into. If %s is found in
 *                  the URL, the query is inserted there, else it is appended.
 *                  If the insertion point is in the "query string" of the URL,
 *                  the query is percent-encoded, else it is verbatim.
 **/
//#background
export function searchsetkeyword(keyword: string, url: string){
    config.set("searchurls", keyword, forceURI(url))
}

/** Set a key value pair in config.

    Use to set any string values found [here](/static/docs/modules/_config_.html#defaults)

    e.g.
        set searchurls.google https://www.google.com/search?q=
        set logging.messaging info
*/
//#background
export function set(key: string, ...values: string[]) {
    if (! key || ! values[0]) {
        throw "Both key and value must be provided!"
    }

    const target = key.split('.')

    // Special case conversions
    // TODO: Should we do any special case shit here?
    switch (target[0]) {
        case "logging":
            const map = {
                "never": Logging.LEVEL.NEVER,
                "error": Logging.LEVEL.ERROR,
                "warning": Logging.LEVEL.WARNING,
                "info": Logging.LEVEL.INFO,
                "debug": Logging.LEVEL.DEBUG,
            }
            let level = map[values[0].toLowerCase()]
            if (level === undefined) throw "Bad log level!"
            else config.set(...target, level)
            return
    }

    const currentValue = config.get(...target)

    if (Array.isArray(currentValue)) {
        config.set(...target, values)
    } else if (currentValue === undefined || typeof currentValue === "string") {
        config.set(...target, values.join(' '))
    } else {
        throw "Unsupported setting type!"
    }
}

/** Set autocmds to run when certain events happen.

 @param event Curently, only 'DocStart' is supported.

 @param url The URL on which the events will trigger (currently just uses "contains")

 @param excmd The excmd to run (use [[composite]] to run multiple commands)

*/
//#background
export function autocmd(event: string, url: string, ...excmd: string[]){
    // rudimentary run time type checking
    // TODO: Decide on autocmd event names
    if(!['DocStart'].includes(event)) throw (event + " is not a supported event.")
    config.set("autocmds", event, url, excmd.join(" "))
}

/** Unbind a sequence of keys so that they do nothing at all.

    See also:

        - [[bind]]
        - [[reset]]
*/
//#background
export async function unbind(key: string){
    config.set("nmaps", key, "")
}

/** Restores a sequence of keys to their default value.

    See also:

        - [[bind]]
        - [[unbind]]
*/
//#background
export async function reset(key: string){
    config.unset("nmaps",key)

    // Code for dealing with legacy binds
    let nmaps = (await browser.storage.sync.get("nmaps"))["nmaps"]
    nmaps = (nmaps == undefined) ? {} : nmaps
    delete nmaps[key]
    browser.storage.sync.set({nmaps})
}

/** Deletes various privacy-related items.

    The list of possible arguments can be found here:
    https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/browsingData/DataTypeSet

    Additional, tridactyl-specific arguments are:
    - commandline: Removes the in-memory commandline history.
    - tridactyllocal: Removes all tridactyl storage local to this machine. Use it with
        commandline if you want to delete your commandline history.
    - tridactylsync: Removes all tridactyl storage associated with your Firefox Account (i.e, all user configuration, by default).
    These arguments aren't affected by the timespan parameter.

    Timespan parameter:
    -t [0-9]+(m|h|d|w)

    Examples:
    `sanitize all` -> Deletes everything
    `sanitize history` -> Deletes all history
    `sanitize commandline tridactyllocal tridactylsync` -> Deletes every bit of data Tridactyl holds
    `sanitize cookies -t 3d` -> Deletes cookies that were set during the last three days.

*/
//#background
export async function sanitize(...args: string[]) {
    let flagpos = args.indexOf("-t")
    let since = {}
    // If the -t flag has been given and there is an arg after it
    if (flagpos > -1) {
        if (flagpos < args.length - 1) {
            let match = args[flagpos + 1].match('^([0-9])+(m|h|d|w)$')
            // If the arg of the flag matches Pentadactyl's sanitizetimespan format
            if (match !== null && match.length == 3) {
                // Compute the timespan in milliseconds and get a Date object
                let millis = parseInt(match[1]) * 1000
                switch (match[2]) {
                    case 'w': millis *= 7
                    case 'd': millis *= 24
                    case 'h': millis *= 60
                    case 'm': millis *= 60
                }
                since = { "since": (new Date()).getTime() - millis }
            } else {
                throw new Error(":sanitize error: expected time format: ^([0-9])+(m|h|d|w)$, given format:" + args[flagpos+1])
            }
        } else {
            throw new Error(":sanitize error: -t given but no following arguments")
        }
    }

    let dts = {
        "cache": false,
        "cookies": false,
        "downloads": false,
        "formData": false,
        "history": false,
        "localStorage": false,
        "passwords": false,
        "serviceWorkers": false,
        // These are Tridactyl-specific
        "commandline": false,
        "tridactyllocal": false,
        "tridactylsync": false,
        /* When this one is activated, a lot of errors seem to pop up in
           the console. Keeping it disabled is probably a good idea.
        "pluginData": false,
         */
        /* These 3 are supported by Chrome and Opera but not by Firefox yet.
        "fileSystems": false,
        "indexedDB": false,
        "serverBoundCertificates": false,
         */
    }
    if (args.find(x => x == "all") !== undefined) {
        for (let attr in dts)
            dts[attr] = true
    } else {
        // We bother checking if dts[x] is false because
        // browser.browsingData.remove() is very strict on the format of the
        // object it expects
        args.map(x => { if (dts[x] === false) dts[x] = true })
    }
    // Tridactyl-specific items
    if (dts.commandline === true)
        state.cmdHistory = []
    delete dts.commandline
    if (dts.tridactyllocal === true)
        browser.storage.local.clear()
    delete dts.tridactyllocal
    if (dts.tridactylsync === true)
        browser.storage.sync.clear()
    delete dts.tridactylsync
    // Global items
    browser.browsingData.remove(since, dts)
}

/** Bind a quickmark for the current URL to a key.

    Afterwards use go[key], gn[key], or gw[key] to [[open]], [[tabopen]], or
    [[winopen]] the URL respectively.

*/
//#background
export async function quickmark(key: string, ...addressarr: string[]) {
    // ensure we're binding to a single key
    if (key.length !== 1) {
        return
    }

    if (addressarr.length <= 1) {
        let address = addressarr.length == 0 ? (await activeTab()).url : addressarr[0]
        // Have to await these or they race!
        await bind("gn" + key, "tabopen", address)
        await bind("go" + key, "open", address)
        await bind("gw" + key, "winopen", address)
    } else {
        let compstring = addressarr.join(" | tabopen ")
        let compstringwin = addressarr.join(" | winopen ")
        await bind("gn" + key, "composite tabopen", compstring)
        await bind("go" + key, "composite open", compstring)
        await bind("gw" + key, "composite winopen", compstringwin)
    }
}

/** Puts the contents of config value with keys `keys` into the commandline and the background page console

    It's a bit rubbish, but we don't have a good way to provide feedback to the commandline yet.

    You can view the log entry in the browser console (Ctrl-Shift-j).
*/
//#background
export function get(...keys: string[]) {
    const target = keys.join('.').split('.')
    const value = config.get(...target)
    console.log(value)
    if (typeof value === "object") {
        fillcmdline_notrail(`# ${keys.join('.')} = ${JSON.stringify(value)}`)
    } else {
        fillcmdline_notrail(`# ${keys.join('.')} = ${value}`)
    }
}

//#background
export function unset(...keys: string[]){
    const target = keys.join('.').split('.')
    if(target === undefined) throw("You must define a target!")
    config.unset(...target)
}

// not required as we automatically save all config
////#background
//export function saveconfig(){
//    config.save(config.get("storageloc"))
//}

////#background
//export function mktridactylrc(){
//    saveconfig()
//}


// }}}

// {{{ HINTMODE

//#background_helper
import * as hinting from './hinting_background'

/** Hint a page.

    @param option
        - -b open in background
        - -y copy (yank) link's target to clipboard
        - -p copy an element's text to the clipboard
        - -r read an element's text with text-to-speech
        - -i view an image
        - -I view an image in a new tab
        - -k delete an element from the page
        - -s save (download) the linked resource
        - -S save the linked image
        - -a save-as the linked resource
        - -A save-as the linked image
        - -; focus an element
        - -# yank an element's anchor URL to clipboard
        - -c [selector] hint links that match the css selector
          - `bind ;c hint -c [class*="expand"],[class="togg"]` works particularly well on reddit and HN
        - -w open in new window
            -wp open in new private window

    Excepting the custom selector mode and background hint mode, each of these
    hint modes is available by default as `;<option character>`, so e.g. `;y`
    to yank a link's target.

    To open a hint in the background, the default bind is `F`.

    Related settings:
        "hintchars": "hjklasdfgyuiopqwertnmzxcvb"
        "hintfiltermode": "simple" | "vimperator" | "vimperator-reflow"
        "relatedopenpos": "related" | "next" | "last"
*/
//#background
export function hint(option?: string, selectors="") {
    if (option === '-b') hinting.hintPageOpenInBackground()
    else if (option === "-y") hinting.hintPageYank()
    else if (option === "-p") hinting.hintPageTextYank()
    else if (option === "-i") hinting.hintImage(false)
    else if (option === "-I") hinting.hintImage(true)
    else if (option === "-k") hinting.hintKill()
    else if (option === "-s") hinting.hintSave("link", false)
    else if (option === "-S") hinting.hintSave("img", false)
    else if (option === "-a") hinting.hintSave("link", true)
    else if (option === "-A") hinting.hintSave("img", true)
    else if (option === "-;") hinting.hintFocus()
    else if (option === "-#") hinting.hintPageAnchorYank()
    else if (option === "-c") hinting.hintPageSimple(selectors)
    else if (option === "-r") hinting.hintRead()
    else if (option === "-w") hinting.hintPageWindow()
    else if (option === "-wp") hinting.hintPageWindowPrivate()
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


// {{{TEXT TO SPEECH

import * as TTS from './text_to_speech'

/**
 * Read text content of elements matching the given selector
 *
 * @param selector the selector to match elements
 */
//#content_helper
function tssReadFromCss(selector: string): void {
    let elems = DOM.getElemsBySelector(selector, [])

    elems.forEach(e=>{
        TTS.readText(e.textContent)
    })
}

/**
 * Read the given text using the browser's text to speech functionality and
 * the settings currently set
 *
 * @param mode      the command mode
 *                      -t read the following args as text
 *                      -c read the content of elements matching the selector
 */
//#content
export async function ttsread(mode: "-t" | "-c", ...args: string[]) {

    if (mode === "-t") {
        // really should quote args, but for now, join
        TTS.readText(args.join(" "))
    }
    else if (mode === "-c") {

        if (args.length > 0) {
            tssReadFromCss(args[0])
        } else {
            throw "Error: no CSS selector supplied"
        }
    } else {
        throw "Unknown mode for ttsread command: " + mode
    }
}

/**
 * Show a list of the voices available to the TTS system. These can be
 * set in the config using `ttsvoice`
 */
//#background
export async function ttsvoices() {
    let voices = TTS.listVoices()

    // need a better way to show this to the user
    fillcmdline_notrail("#", voices.sort().join(", "))
}

/**
 * Cancel current reading and clear pending queue
 *
 * Arguments:
 *   - stop:    cancel current and pending utterances
 */
//#content
export async function ttscontrol(action: string) {

    let ttsAction: TTS.Action = null

    // convert user input to TTS.Action
    // only pause seems to be working, so only provide access to that
    // to avoid exposing users to things that won't work
    switch (action) {
        case "stop":
            ttsAction = "stop"
            break
    }

    if (ttsAction) {
        TTS.doAction(ttsAction)
    } else {
        throw new Error("Unknown text-to-speech action: " + action)
    }
}

//}}}

// unsupported on android
/** Add or remove a bookmark.
*
* Optionally, you may give the bookmark a title. If no URL is given, a bookmark is added for the current page.
*
* If a bookmark already exists for the URL, it is removed.
*/
//#background
export async function bmark(url?: string, ...titlearr: string[] ){
    url = url === undefined ? (await activeTab()).url : url
    let title = titlearr.join(" ")
    let dupbmarks = await browser.bookmarks.search({url})
    dupbmarks.map((bookmark) => browser.bookmarks.remove(bookmark.id))
    if (dupbmarks.length == 0 ) {browser.bookmarks.create({url, title})}
}

// vim: tabstop=4 shiftwidth=4 expandtab

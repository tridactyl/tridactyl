// Implementation for all built-in ExCmds

import './number.mod'
import state from "./state"

interface ContentCommandMessage extends Message {
    type: "excmd_contentcommand"
    command: string
    args?: Array<any>
}

const DEFAULT_FAVICON = browser.extension.getURL("static/defaultFavicon.svg")

/** The first active tab in the currentWindow.
 *
 * TODO: Highlander theory: Can there ever be more than one?
 *
 */
async function getActiveTab() {
    return (await browser.tabs.query({active:true, currentWindow:true}))[0]
}

async function messageCommandline(command: string, args?: Array<any>) {
    let message: Message = {
        type: 'commandline_frame',
        command,
        args,
    }
    // For commandlines not in iframes on content scripts, use runtime
    browser.tabs.sendMessage((await getActiveTab()).id, message)
}

function messageActiveTab(command: string, args?: Array<any>) {
    messageFilteredTabs({active:true, currentWindow: true}, command, args)
}

async function messageFilteredTabs(filter, command: string, args?: Array<any>) {
    let message: ContentCommandMessage = {type: "excmd_contentcommand", command: command}
    if (!(args == undefined)) message.args = args

    let filtTabs = await browser.tabs.query(filter)
    filtTabs.map((tab) => {
        browser.tabs.sendMessage(tab.id,message)
    })
}

function hasScheme(uri: string) {
    return uri.match(/^(\w+):/)
}

// Mode changing commands
// TODO: Generalise this
export function insertmode() {state.mode = "INSERT"}
export function normalmode() {state.mode = "NORMAL"}

// Scrolling functions
export function scrollby(x: number, y: number ) { messageActiveTab("scrollpx", [x, y]) }
export function scroll(n = 1) { scrollby(0, n) }
export function scrollx(n = 1) { scrollby(n, 0) }
export function scrollline(n = 1) { messageActiveTab("scrollline", [n]) }
export async function scrollpage(n = 1) {
    messageActiveTab("scrollpage", [n*(await browser.windows.getCurrent()).height])
}
export function scrollto(amount: number | [number, number]) { messageActiveTab("scrollto", [amount]) }

// Tab functions

// TODO: to be implemented!
export async function getnexttabs(tabid: number, n: number){
    return [tabid]
}

function tabSetActive(id: number) {
    browser.tabs.update(id,{active:true})
}

export function closetabs(ids: number[]){
    browser.tabs.remove(ids)
}

export async function getactivetabid(){
    return (await getActiveTab()).id
}

// NB: it is unclear how to undo tab closure.
export async function tabclose(n = 1){
    let activeTabID = await getactivetabid()
    closetabs(await getnexttabs(activeTabID,n))
}

export async function tabmove(n?: string){
    let activeTab = await getActiveTab(), m: number
    if (!n) { browser.tabs.move(activeTab.id, {index: -1}); return; }
    else if (n.startsWith("+") || n.startsWith("-")) {
        m = Math.max(0, Number(n) + activeTab.index)
    }
    else m = Number(n)
    browser.tabs.move(activeTab.id, {index: m})
}

export async function tabdetach(id?: number){
    id = id ? id : (await getactivetabid())
    browser.windows.create({tabId: id})
}

export async function tabduplicate(id?: number){
    id = id ? id : (await getactivetabid())
    browser.tabs.duplicate(id)
}

export async function undo(){
    let id = (await browser.sessions.getRecentlyClosed({maxResults: 1}))[0].id
    browser.sessions.restore(id)
}

export async function pin(){
    let activeTab = await getActiveTab()
    browser.tabs.update(activeTab.id, {pinned: !activeTab.pinned})
}

export async function reload(n = 1, hard = false){
    let tabstoreload = await getnexttabs(await getactivetabid(),n)
    let reloadProperties = {bypassCache: hard}
    tabstoreload.map(
        (n)=>browser.tabs.reload(n, reloadProperties)
    )
}

export async function reloadhard(n = 1){
    reload(n, true)
}

// Commandline function

export function showcommandline(exstr = "", ...args){
    messageActiveTab("showcommandline")
    exstr = exstr == "" ? exstr : exstr + " " + args.join(" ")
    messageCommandline("changecommand", [exstr,])
}

export function hidecommandline(){
    messageActiveTab("hidecommandline")
}

export async function winopen(...args){
    let address: string
    const createData = {}
    if (args[0] === "-private") {
        createData['incognito'] = true
        if (args[1]) address = args[1]
    }
    else if (args[0]) address = args[0]
    if (address) createData['url'] = (hasScheme(address)? "" : "http://") + address
    browser.windows.create(createData)
}

// TODO: address should default to some page to which we have access
//          and focus the location bar
export async function tabopen(address?: string){
    if (address) address = (hasScheme(address)? "" : "http://") + address
    browser.tabs.create({url: address})
}

/** Switch to the next tab by index (position on tab bar), wrapping round.

    optional increment is number of tabs forwards to move.
 */
export async function tabnext(increment = 1) {
    try {
        // Get an array of tabs in the current window
        let current_window = await browser.windows.getCurrent()
        let tabs = await browser.tabs.query({windowId:current_window.id})

        // Find the active tab (this is safe: there will only ever be one)
        let activeTab = tabs.filter((tab: any) => {return tab.active})[0]

        // Derive the index we want
        let desiredIndex = (activeTab.index + increment).mod(tabs.length)

        // Find and switch to the tab with that index
        let desiredTab = tabs.filter((tab: any) => {return tab.index === desiredIndex})[0]
        tabSetActive(desiredTab.id)
    }
    catch(error) {
        console.log(error)
    }
}
export function tabprev(increment = 1) { tabnext(increment*-1) }

// History/navigation functions
export function history(n = 1) {messageActiveTab("history",[n])}
export function historyback(n = 1) {history(n*-1)}
export function historyforward(n = 1) {history(n)}
export function open(url: string) {
    url = (hasScheme(url)? "" : "http://") + url
    messageActiveTab("open", [url])
}

// Hard coded search but lack thereof was annoying
export function google(query: string[]){
    let url = "https://www.google.co.uk/search?q=" + query//.join("+")
    messageActiveTab("open", [url])
}

// Misc functions
export function focuscmdline() { messageActiveTab("focuscmdline") }
export async function openbuffer() {
    showcommandline("buffer")
    messageCommandline("changecompletions", [await listTabs(),])
    messageActiveTab("resizecommandline")

}
export async function buffer(n?: number | string) {
    if (!n || Number(n) == 0) return // Vimperator index starts at 1
    if (n === "#") {
        n = (await browser.tabs.query({currentWindow: true}))
            .sort((a, b) => { return (a.lastAccessed < b.lastAccessed ? 1 : -1) })[1].index + 1
    }
    tabSetActive((await browser.tabs.query({currentWindow: true, index: Number(n) - 1}))[0].id)
}
async function getTabs() {
    const tabs = await browser.tabs.query({currentWindow: true})
    const lastActive = tabs.sort((a, b) => { return (a.lastAccessed < b.lastAccessed ? 1 : -1) })[1]
    tabs.sort((a, b) => { return (a.index < b.index ? -1 : 1) })
    console.log(tabs)
    return [tabs, lastActive]
}
function formatTab(tab: browser.tabs.Tab, prev?: boolean) {
    let formatted = `<div> `, url = `<div class="url">`
    if (tab.active) formatted += "%"
    else if (prev) formatted +="#"
    if (tab.pinned) formatted += "@"
    formatted = formatted.padEnd(9)
    // TODO: Dynamically set favicon dimensions.
    formatted += (tab.favIconUrl
        ? `<img src="${tab.favIconUrl}" height="10px" width="10px"> `
        : `<img src="${DEFAULT_FAVICON}" height="10px" width="10px"> `)
    formatted += `${tab.index + 1}: ${tab.title}`
    url += `<a href="${tab.url}" target="_blank">${tab.url}</a></div></div>`
    return formatted + url
}
async function listTabs() {
    let buffers: string = "", tabs = await getTabs()
    for (let tab of tabs[0] as Array<browser.tabs.Tab>) {
        buffers += (tab === tabs[1] ? formatTab(tab, true) : formatTab(tab))
    }
    return buffers
}

// Moderately slow; should load in results as they arrive, perhaps
// Todo: allow jumping to buffers once they are found
// Consider adding to buffers with incremental search
//      maybe only if no other results in URL etc?
// Find out how to return context of each result
export async function findintabs(query: string){
    const tabs = await browser.tabs.query({currentWindow: true})
    console.log(query)
    const findintab = async (tab) => await browser.find.find(query,{tabId: tab.id})
    let results = []
    for (let tab of tabs) {
        let result = await findintab(tab)
        if (result.count > 0) {
            results.push({tab, result})
        }
    }
    results.sort((r) => r.result.count)
    console.log(results)
    return results
}

// Implementation for all built-in ExCmds

import './number.mod'
import state from "./state"

interface ContentCommandMessage extends Message {
    type: "excmd_contentcommand"
    command: string
    args?: Array<any>
}

function messageActiveTab(command: string, args?: Array<any>) {
    messageFilteredTabs({active:true}, command, args)
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
export function scrolldown(n = 1) { scrollby(0, n) }
export function scrollup(n = 1) { scrolldown(n*-1) }
export function scrollright(n = 1) { scrollby(n, 0) }
export function scrollleft(n = 1) { scrollright(n*-1) }

export function scrolldownline(n = 1) { messageActiveTab("scrollline", [n]) }
export function scrollupline(n = 1) { scrolldownline(n*-1) }

export function scrolldownpage(n = 1) { messageActiveTab("scrollpage", [n]) }
export function scrolluppage(n = 1) { scrolldownpage(n*-1) }

export async function scrolldownhalfpage(n = 1) {
  const current_window = await browser.windows.getCurrent()
  scrolldown(n*0.5*current_window.height)
}
export function scrolluphalfpage(n = 1) { scrolldownhalfpage(n*-1) }

export function scrolltobottom() { scrolldown(999999999) } // maximum value scrolldown would respond to
export async function scrolltotop() {
  const current_window = await browser.windows.getCurrent()
  messageActiveTab("scrollto", [current_window.left, 0])
}

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
    return (await browser.tabs.query({active: true}))[0].id
}

// NB: it is unclear how to undo tab closure.
export async function tabclose(n = 1){
    let activeTabID = await getactivetabid()
    closetabs(await getnexttabs(activeTabID,n))
}

export async function reload(n = 1, hard = false){
    let tabstoreload = await getnexttabs(await getactivetabid(),n)
    let reloadProperties = {bypassCache: hard}
    tabstoreload.map(
        (n)=>browser.tabs.reload(n, reloadProperties)
    )
}

// Commandline function

export function showcommandline(){
    messageActiveTab("showcommandline")
}

export function hidecommandline(){
    messageActiveTab("hidecommandline")
}

// TODO: address should default to some page to which we have access
//          and focus the location bar
export async function tabopen(address?: string){
    if (address) address = (hasScheme(address)? "" : "http://") + address
    browser.tabs.create({url: address})
}

export async function reloadhard(n = 1){
    reload(n, true)
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

// History functions
export function history(n = 1) {messageActiveTab("history",[n])}
export function historyback(n = 1) {history(n*-1)}
export function historyforward(n = 1) {history(n)}

// Misc functions
export function focuscmdline() { messageActiveTab("focuscmdline") }

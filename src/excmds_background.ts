// Implementation for all built-in ExCmds
//
// Example code. Needs to be replaced
namespace ExCmds {

    interface ContentCommandMessage {
        type: string
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

    // Scrolling functions
    export function scrolldown(n = 1) { messageActiveTab("scrollpx", [n]) }
    export function scrollup(n = 1) { scrolldown(n*-1) }

    export function scrolldownpage(n = 1) { messageActiveTab("scrollpage", [n]) }
    export function scrolluppage(n = 1) { scrolldownpage(n*-1) }

    export async function scrolldownhalfpage(n = 1) {
      const current_window = await browser.windows.getCurrent()
      scrolldown(n*0.5*current_window.height)
    }
    export function scrolluphalfpage(n = 1) { scrolldownhalfpage(n*-1) }

    export function scrolldownline(n = 1) { messageActiveTab("scrollline", [n]) }
    export function scrollupline(n = 1) { scrolldownline(n*-1) }


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

    // TODO: address should default to some page to which we have access
    //          and focus the location bar
    export async function tabopen(address?: string){
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
}

// From main.ts

/* export async function incTab(increment: number) { */
/*     try { */
/*         let current_window = await browser.windows.getCurrent() */
/*         let tabs = await browser.tabs.query({windowId:current_window.id}) */
/*         let activeTab = tabs.filter((tab: any) => {return tab.active})[0] */
/*         let desiredIndex = (activeTab.index + increment).mod(tabs.length) */
/*         let desiredTab = tabs.filter((tab: any) => {return tab.index == desiredIndex})[0] */
/*         setTab(desiredTab.id) */
/*     } */
/*     catch(error) { */
/*         console.log(error) */
/*     } */

/* export async function setTab(id: number) { */
/*     browser.tabs.update(id,{active:true}) */
/* } */


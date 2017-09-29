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
    
    export async function tabnext(increment: number) {
        try {
            let current_window = await browser.windows.getCurrent()
            let tabs = await browser.tabs.query({windowId:current_window.id})
            let activeTab = tabs.filter((tab: any) => {return tab.active})[0]
            let desiredIndex = (activeTab.index + increment).mod(tabs.length)
            let desiredTab = tabs.filter((tab: any) => {return tab.index == desiredIndex})[0]
            tabgo(desiredTab.id)
        }
        catch(error) {
            console.log(error)
        }
    }

    export function tabgo(id: number) {
        browser.tabs.update(id,{active:true})
    }


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


// Implementation for all built-in ExCmds
//
// Example code. Needs to be replaced
namespace ExCmds {

    async function sendMessageToActiveTab(message: Message){
        sendMessageToFilteredTabs({active:true},message)
    }

    async function sendMessageToFilteredTabs(filter,message: Message){
        let filtTabs = await browser.tabs.query(filter)
        filtTabs.map((tab) => {
            browser.tabs.sendMessage(tab.id,message)
        })
    }

    function messageHelper(string){
        return function(n: number){
            sendMessageToActiveTab({command: string, number: n})
        }
    }

    const scroll = messageHelper("scroll")
    const scroll_lines = messageHelper("scroll_lines")
    const scroll_pages = messageHelper("scroll_pages")

    export function scrolldown(n = 1) { scroll(n) }
    export function scrolldownline(n = 1) { scroll_lines(n) }
    export function scrolldownpage(n = 1) { scroll_pages(n) }

    export const scrollup = function (n = 1) { scrolldown(n*-1) }
    export const scrollupline = function (n = 1) { scrolldownline(n*-1) }
    export const scrolluppage = funciton (n = 1) { scrolluppage(n*-1) }

    export const scrolldownhalfpage = async function (n = 1) {
      const current_window = await browser.windows.getCurrent()
      scrolldown(n*0.5*current_window.height)
    }
    export const scrolluphalfpage = async function (n = 1) { scrolldownhalfpage(n*-1) }
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


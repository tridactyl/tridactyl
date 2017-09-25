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

    let scroll = messageHelper("scroll")

    export function scrolldown(n = 1) {
        scroll(n)
    }
        
    export let scrollup = function (n: number) { scrolldown(n*-1) }

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


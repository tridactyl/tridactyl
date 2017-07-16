interface Number {
    mod(n: number): number
}

module tridactyl {

    // Dunno how to export this
    Number.prototype.mod = function (n: number): number {
        return Math.abs(this % n)
    }

    export async function incTab(increment: number) {
        try {
            let current_window = await browser.windows.getCurrent()
            let tabs = await browser.tabs.query({windowId:current_window.id})
            let activeTab = tabs.filter((tab: any) => {tab.active})[0]
            let desiredIndex = (activeTab.index + increment).mod(tabs.length)
            let desiredTab = tabs.filter((tab: any) => {tab.index == desiredIndex})
            //setTab(desiredTab.id)
        }
        catch(error) {
            console.log(error)
        }
    }

    export async function setTab(id: number) {
        browser.tabs.update(id,{active:true})
    }

    async function sendMessageToActiveTab(message: Message){
        sendMessageToFilteredTabs({active:true},message)
    }

    async function sendMessageToFilteredTabs(filter,message: Message){
        let filtTabs = await browser.tabs.query(filter)
        filtTabs.map((tab) => {
            browser.tabs.sendMessage(tab.id,message)
        })
    }

    function funcMaker(string){
        return async function(n: number){
            sendMessageToActiveTab({command: string, number: n})
        }
    }

    export let goScroll = funcMaker("scroll")
    export let goHistory = funcMaker("history")

} // End of module


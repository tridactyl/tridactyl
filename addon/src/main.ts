async function incTab(increment: number) {
    try {
        let current_window = await browser.windows.query({active: true})
        let tabs = await browser.tabs.query({windowId:current_window.id})
        let activeTab = tabs.filter((tab: any) => {tab.active})
        let desiredIndex = (activeTab.index + increment).mod(tabs.length)
        let desiredTab = tabs.filter((tab: any) => {tab.index == desiredIndex})
        setTab(desiredTab.id)
    }
    catch(error) {
        console.log(error)
    }
}

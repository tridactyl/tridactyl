import * as Messaging from './messaging'

/** CommandLine API for inclusion in background script

  Receives messages from commandline_frame
*/
export namespace onLine {

    export type onLineCallback = (exStr: string) => void

    const listeners = new Set<onLineCallback>()
    export function addListener(cb: onLineCallback) {
        listeners.add(cb)
        return () => { listeners.delete(cb) }
    }

    /** Receive events from commandline_frame and pass to listeners */
    function recvExStr(exstr: string) {
        for (let listener of listeners) {
            listener(exstr)
        }
    }

    /** Helpers for completions */
    async function currentWindowTabs(): Promise<browser.tabs.Tab[]> {
        return await browser.tabs.query({currentWindow:true})
    }

    async function allWindowTabs(): Promise<browser.tabs.Tab[]> {
        let allTabs: browser.tabs.Tab[] = []
        for (const window of await browser.windows.getAll()) {
            const tabs = await browser.tabs.query({windowId:window.id})
            allTabs = allTabs.concat(tabs)
        }
        return allTabs
    }

    Messaging.addListener("commandline_background", Messaging.attributeCaller({currentWindowTabs, recvExStr}))
}

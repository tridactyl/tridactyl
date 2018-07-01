import * as Messaging from "./messaging"

export type onLineCallback = (exStr: string) => void

/** CommandLine API for inclusion in background script

  Receives messages from commandline_frame
*/
export const onLine = {
    addListener: function(cb: onLineCallback) {
        listeners.add(cb)
        return () => {
            listeners.delete(cb)
        }
    },
}

const listeners = new Set<onLineCallback>()

/** Receive events from commandline_frame and pass to listeners */
function recvExStr(exstr: string) {
    for (let listener of listeners) {
        listener(exstr)
    }
}

/** Helpers for completions */
async function currentWindowTabs(): Promise<browser.tabs.Tab[]> {
    return await browser.tabs.query({ currentWindow: true })
}

async function history(): Promise<browser.history.HistoryItem[]> {
    return await browser.history.search({
        text: "",
        maxResults: 50,
        startTime: 0,
    })
}
async function allWindowTabs(): Promise<browser.tabs.Tab[]> {
    let allTabs: browser.tabs.Tab[] = []
    for (const window of await browser.windows.getAll()) {
        const tabs = await browser.tabs.query({ windowId: window.id })
        allTabs = allTabs.concat(tabs)
    }
    return allTabs
}

export async function show(focus = true) {
    Messaging.messageActiveTab("commandline_content", "show")
    if (focus) {
        await Messaging.messageActiveTab("commandline_content", "focus")
        await Messaging.messageActiveTab("commandline_frame", "focus")
    }
}

export async function hide() {
    Messaging.messageActiveTab("commandline_content", "hide")
    Messaging.messageActiveTab("commandline_content", "blur")
}

Messaging.addListener(
    "commandline_background",
    Messaging.attributeCaller({
        allWindowTabs,
        currentWindowTabs,
        history,
        recvExStr,
        show,
        hide,
    }),
)

/**
 *
 * Completion functions related to the list of currently-open tabs.
 *
 */

import * as Logging from "@src/lib/logging"
import { browserBg } from "@src/lib/webext"
import * as Complete from "@src/lib/completefns"
import * as CompleteUtils from "@src/lib/completefns_utils"
import * as Messaging from "@src/lib/messaging"

const logger = new Logging.Logger("completions")

// interface CommonRenderConfig {
//     // The characters to be displayed in the leftmost column
//     indicatorStr?: string
//     // The url of the favicon to be displayed
//     faviconUrl?: string
//     // The container to display
//     container?: browser.contextualIdentities.ContextualIdentity
// }

// // A common render function for options that display tabs.
// export function CommonRender(renderInfo: CommonRenderConfig): HTMLElement {
//     html`<tr class="BufferCompletionOption option container_${
//             renderInfo.container.color
//         } container_${renderInfo.container.icon} container_${renderInfo.container.name}">
//             <td class="prefix">${pre.padEnd(2)}</td>
//             <td class="container"></td>
//             <td class="icon"><img src="${renderInfo.favIconUrl}"/></td>
//             <td class="title">${tab.index + 1}: ${tab.title}</td>
//             <td class="content"><a class="url" target="_blank" href=${
//                 tab.url
//             }>${tab.url}</a></td>
//         </tr>`
//     return
// }

async function getTabs(allBuffers: boolean): Promise<browser.tabs.Tab[]> {
    let cmd = allBuffers ? "allWindowTabs" : "currentWindowTabs";
    return Messaging.message("commandline_background", cmd)
}

type WindowMap = { [windowId: number]: browser.windows.Window }

/**
 * Map all windows into a {[windowId]: window} object
 */
async function getWindows(): Promise<WindowMap> {
    const windows = await browserBg.windows.getAll()
    const response: { [windowId: number]: browser.windows.Window } = {}
    windows.forEach(win => (response[win.id] = win))
    return response
}

function sortTabs(tabs: browser.tabs.Tab[]) {
    let cmpWindowId = (a, b) => {
        return a.windowId - b.windowId
    }

    let cmpTabIndex = (a, b) => {
        return a.index - b.index
    }

    tabs.sort((a, b) => {
        return cmpWindowId(a, b) || cmpTabIndex(a, b)
    })
}

function populateFuse(options: Complete.Completion[]) {
}

function buildOptionFromTab(tab: browser.tabs.Tab, source: Complete.CompletionFn): Complete.Completion {
    let containers = browser.contextualIdentities.query
    
    return {
        // TODO implement this
        accept: (inputState: Complete.ExcmdInputState) => "",
        // TODO implement this
        update: (c: Complete.Completion, e: Complete.ExcmdInputState) => c,
        source,
        // TODO implement these
        focused: false,
        matching: true,
    }
}

function processTabsIntoOptions(tabs: browser.tabs.Tab[], windows: WindowMap, source: Complete.CompletionFn): Complete.Completion[] {
    let options: Complete.Completion[] = tabs.map((t) => buildOptionFromTab(t, source))
    populateFuse(options)
    return options
}

async function buffers(inputState: Complete.ExcmdInputState, lastCompletions: Complete.Completion[]): Promise<Complete.Completion[]> {
    const [matched, prefix, rest] = CompleteUtils.prefixed(inputState, ["buffer", "tabclose", "tabdetach", "tabduplicate", "tabmove"])
    if(!matched) return []

    let completions: Complete.Completion[]

    if(lastCompletions.length == 0) {
        const [tabs, windows] = await Promise.all([getTabs(false), getWindows()])
        sortTabs(tabs)
        completions = processTabsIntoOptions(tabs, windows, buffers)
    } else {
        completions = lastCompletions
    }

    

    return []
}
Complete.addCompletionSource(buffers)

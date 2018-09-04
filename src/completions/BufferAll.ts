import { browserBg } from "../lib/webext"
import * as Containers from "../lib/containers"
import * as Messaging from "../messaging"
import * as Completions from "../completions"

class BufferAllCompletionOption extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []
    constructor(
        public value: string,
        tab: browser.tabs.Tab,
        winindex: number,
        container: browser.contextualIdentities.ContextualIdentity,
        incognito: boolean,
    ) {
        super()
        this.value = `${winindex}.${tab.index + 1}`
        this.fuseKeys.push(this.value, tab.title, tab.url)

        // Create HTMLElement
        const favIconUrl = tab.favIconUrl
            ? tab.favIconUrl
            : Completions.DEFAULT_FAVICON
        this.html = html`<tr class="BufferAllCompletionOption option container_${
            container.color
        } container_${container.icon} container_${container.name} ${
            incognito ? "incognito" : ""
        }">
            <td class="prefix"></td>
            <td class="privatewindow"></td>
            <td class="container"></td>
            <td class="icon"><img src="${favIconUrl}"/></td>
            <td class="title">${this.value}: ${tab.title}</td>
            <td class="content"><a class="url" target="_blank" href=${
                tab.url
            }>${tab.url}</a></td>
        </tr>`
    }
}

export class BufferAllCompletionSource extends Completions.CompletionSourceFuse {
    public options: BufferAllCompletionOption[]

    constructor(private _parent) {
        super(["bufferall"], "BufferAllCompletionSource", "All Buffers")

        this.updateOptions()
        this._parent.appendChild(this.node)
    }

    async onInput(exstr) {
        await this.updateOptions()
    }

    /**
     * Map all windows into a {[windowId]: window} object
     */
    private async getWindows() {
        const windows = await browserBg.windows.getAll()
        const response: {[windowId: number]: browser.windows.Window} = {}
        windows.forEach(win => response[win.id] = win)
        return response
    }

    private async updateOptions(exstr?: string) {
        const tabsPromise = Messaging.message(
            "commandline_background",
            "allWindowTabs",
        )
        const windowsPromise = this.getWindows()
        const [tabs, windows] = await Promise.all([tabsPromise, windowsPromise])

        const options = []

        tabs.sort((a, b) => {
            if (a.windowId == b.windowId) return a.index - b.index
            return a.windowId - b.windowId
        })

        // Window Ids don't make sense so we're using LASTID and WININDEX to compute a window index
        // This relies on the fact that tabs are sorted by window ids
        let lastId = 0
        let winindex = 0
        for (const tab of tabs) {
            if (lastId != tab.windowId) {
                lastId = tab.windowId
                winindex += 1
            }
            options.push(
                new BufferAllCompletionOption(
                    tab.id.toString(),
                    tab,
                    winindex,
                    await Containers.getFromId(tab.cookieStoreId),
                    windows[tab.windowId].incognito,
                ),
            )
        }

        this.completion = undefined
        this.options = options
        this.updateChain()
    }

    setStateFromScore(scoredOpts: Completions.ScoredOption[]) {
        super.setStateFromScore(scoredOpts, true)
    }
}

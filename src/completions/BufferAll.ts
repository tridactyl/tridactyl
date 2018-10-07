import * as Perf from "@src/perf"
import { browserBg } from "@src/lib/webext"
import { enumerate, maxby } from "@src/lib/itertools"
import * as Containers from "@src/lib/containers"
import * as Messaging from "@src/lib/messaging"
import * as Completions from "@src/completions"

class BufferAllCompletionOption extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []
    constructor(
        public value: string,
        tab: browser.tabs.Tab,
        winindex: number,
        public isAlternative = false,
        container: browser.contextualIdentities.ContextualIdentity,
        incognito: boolean,
    ) {
        super()

        // Two character buffer properties prefix
        let pre = ""
        if (tab.active) pre += "%"
        else if (isAlternative) {
            pre += "#"
            this.value = "#"
        }
        if (tab.pinned) pre += "@"

        this.value = `${winindex}.${tab.index + 1}`

        this.fuseKeys.push(pre)
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
            <td class="prefix">${pre.padEnd(2)}</td>
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

    private async getWindows(): Promise<{ [windowId: number]: browser.windows.Window }> {
        const windows = await browserBg.windows.getAll()
        const response: { [windowId: number]: browser.windows.Window } = {}
        windows.forEach(win => (response[win.id] = win))
        return response
    }

    private async getContainers(): Promise<Map<number, browser.contextualIdentities.ContextualIdentity>> {
        const containers = await browserBg.contextualIdentities.query({})
        const result: Map<number, browser.contextualIdentities.ContextualIdentity> = new Map()
        for (const container of containers) {
            result.set(container.cookieStoreId, container)
        }
        return result
    }

    @Perf.measuredAsync
    private async updateOptions(exstr?: string) {
        const tabsPromise = Messaging.message(
            "commandline_background",
            "currentWindowTabs",
        )
        const windowsPromise = this.getWindows()
        const containersPromise = this.getContainers()
        const [tabs, windows, containers] = await Promise.all([tabsPromise, windowsPromise, containersPromise])

        // Get alternative tab, defined as most recently accessed tab
        // that is not focused.
        const [alt, _] = maxby(tabs.filter(t => !t.active), t => t.lastAccessed)

        // Sort by windowid then index
        tabs.sort((a, b) => a.windowId - b.windowId || a.index - b.index)

        // Window Ids don't make sense so we're using LASTID and WININDEX to compute a window index
        // This relies on the fact that tabs are sorted by window ids
        let lastId = 0
        let winindex = 0
        const options = []
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
                    tab === alt,
                    containers.get(tab.cookieStoreId) || Containers.DefaultContainer,
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

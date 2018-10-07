import * as Perf from "@src/perf"
import { browserBg } from "@src/lib/webext"
import { enumerate, maxby } from "@src/lib/itertools"
import * as Containers from "@src/lib/containers"
import * as Messaging from "@src/lib/messaging"
import * as Completions from "@src/completions"

class BufferCompletionOption extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []

    constructor(
        public value: string,
        tab: browser.tabs.Tab,
        public isAlternative = false,
        container: browser.contextualIdentities.ContextualIdentity,
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

        // Push prefix before padding so we don't match on whitespace
        this.fuseKeys.push(pre)

        // Push properties we want to fuzmatch on
        this.fuseKeys.push(String(tab.index + 1), tab.title, tab.url)

        // Create HTMLElement
        const favIconUrl = tab.favIconUrl
            ? tab.favIconUrl
            : Completions.DEFAULT_FAVICON
        this.html = html`<tr class="BufferCompletionOption option container_${
            container.color
        } container_${container.icon} container_${container.name}">
            <td class="prefix">${pre.padEnd(2)}</td>
            <td class="container"></td>
            <td class="icon"><img src="${favIconUrl}"/></td>
            <td class="title">${tab.index + 1}: ${tab.title}</td>
            <td class="content"><a class="url" target="_blank" href=${
                tab.url
            }>${tab.url}</a></td>
        </tr>`
    }
}

export class BufferCompletionSource extends Completions.CompletionSourceFuse {
    public options: BufferCompletionOption[]

    // TODO:
    //     - store the exstr and trigger redraws on user or data input without
    //       callback faffery
    //     - sort out the element redrawing.

    constructor(private _parent) {
        super(
            ["buffer", "tabclose", "tabdetach", "tabduplicate", "tabmove"],
            "BufferCompletionSource",
            "Buffers",
        )

        this.updateOptions()
        this._parent.appendChild(this.node)
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
            "allWindowTabs",
        )
        const windowsPromise = this.getWindows()
        const containersPromise = this.getContainers()
        const [tabs, windows, containers] = await Promise.all([tabsPromise, windowsPromise, containersPromise])

        // Get alternative tab, defined as most recently accessed tab
        // that is not focused.
        const [alt, _] = maxby(tabs.filter(t => !t.active), t => t.lastAccessed)

        // Sort by windowid then index
        tabs.sort((a, b) => a.windowId - b.windowId || a.index - b.index)

        const options = []
        for (const tab of tabs) {
            options.push(
                new BufferCompletionOption(
                    (tab.index + 1).toString(),
                    tab,
                    tab === alt,
                    containers.get(tab.cookieStoreId) || Containers.DefaultContainer,
                ),
            )
        }

        this.completion = undefined
        this.options = options
        this.updateChain()
    }

    async onInput(exstr) {
        // Schedule an update, if you like. Not very useful for buffers, but
        // will be for other things.
        this.updateOptions()
    }

    setStateFromScore(scoredOpts: Completions.ScoredOption[]) {
        super.setStateFromScore(scoredOpts, true)
    }

    /** Score with fuse unless query is a single # or looks like a buffer index */
    scoredOptions(
        query: string,
        options = this.options,
    ): Completions.ScoredOption[] {
        const args = query.trim().split(/\s+/gu)
        if (args.length === 1) {
            // if query is an integer n and |n| < options.length
            if (Number.isInteger(Number(args[0]))) {
                let index = Number(args[0]) - 1
                if (Math.abs(index) < options.length) {
                    index = index.mod(options.length)
                    return [
                        {
                            index,
                            option: options[index],
                            score: 0,
                        },
                    ]
                }
            } else if (args[0] === "#") {
                for (const [index, option] of enumerate(options)) {
                    if (option.isAlternative) {
                        return [
                            {
                                index,
                                option,
                                score: 0,
                            },
                        ]
                    }
                }
            }
        }

        // If not yet returned...
        return super.scoredOptions(query, options)
    }
}

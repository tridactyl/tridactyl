import * as Perf from "@src/perf"
import { browserBg, getSortedTabs, prevActiveTab } from "@src/lib/webext"
import * as Containers from "@src/lib/containers"
import * as Completions from "@src/completions"
import * as config from "@src/lib/config"
import { tabTgroup } from "@src/lib/tab_groups"
import { TabCompletionSource } from "@src/completions/TabBase"
import * as compat from "@src/lib/compat"

class TabAllCompletionOption
    extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []
    public tabId: number
    constructor(
        public value: string,
        tab: browser.tabs.Tab,
        isAlternative: boolean,
        isCurrent: boolean,
        winindex: number,
        container: browser.contextualIdentities.ContextualIdentity,
        incognito: boolean,
        tgroupname: string,
    ) {
        super()
        this.tabId = tab.id
        const valueStr = `${winindex}.${tab.index + 1}`
        this.value = valueStr
        this.fuseKeys.push(this.value, tab.title, tab.url)

        // pre contains max four uppercase characters for tab status.
        // If statusstylepretty is set to true replace use unicode characters,
        // but keep plain letters in hidden column for completion.
        let preplain = ""
        if (isCurrent) {
            preplain += "%"
        } else if (isAlternative) {
            preplain += "#"
            this.value = "#"
        }
        let pre = preplain
        if (tab.pinned) preplain += "P"
        if (tab.audible) preplain += "A"
        if (tab.mutedInfo.muted) preplain += "M"
        if (tab.discarded) preplain += "D"

        if (config.get("completions", "Tab", "statusstylepretty") === "true") {
            if (tab.pinned) pre += "\uD83D\uDCCC"
            if (tab.audible) pre += "\uD83D\uDD0A"
            if (tab.mutedInfo.muted) pre += "\uD83D\uDD07"
            if (tab.discarded) pre += "\u2296"
        } else {
            pre = preplain
        }

        tgroupname = tgroupname === undefined ? "" : tgroupname

        // Push prefix before padding so we don't match on whitespace
        this.fuseKeys.push(pre)
        this.fuseKeys.push(preplain)
        this.fuseKeys.push(tgroupname)

        // Push properties we want to fuzmatch on
        this.fuseKeys.push(String(tab.index + 1), tab.title, tab.url)

        // Create HTMLElement
        const favIconUrl = tab.favIconUrl
            ? tab.favIconUrl
            : Completions.DEFAULT_FAVICON
        const faviconLoading = tab.favIconUrl ? "lazy" : "eager"
        this.html = html`<tr
            class="BufferAllCompletionOption option container_${container.color} container_${container.icon} container_${container.name} ${incognito
                ? "incognito"
                : ""}"
        >
            <td class="prefix">${pre}</td>
            <td class="prefixplain" hidden>${preplain}</td>
            <td class="privatewindow"></td>
            <td class="container"></td>
            <td class="icon">
                <img loading="${faviconLoading}" src="${favIconUrl}" />
            </td>
            <td class="title">${valueStr}: ${tab.title}</td>
            <td class="content">
                <a class="url" target="_blank" href=${tab.url}>${Completions.decodeUrlForDisplay(tab.url)}</a>
            </td>
            <td class="tgroup">${tgroupname}</td>
        </tr>`
    }
}

export class TabAllCompletionSource extends TabCompletionSource {
    public options: TabAllCompletionOption[]
    private optionSet: string
    private shouldSetStateFromScore = true

    constructor(private _parent) {
        super(["taball", "tabgrab"], "TabAllCompletionSource", "All Tabs")

        this.updateOptions()
        this._parent.appendChild(this.node)
        this.shouldSetStateFromScore =
            config.get("completions", "TabAll", "autoselect") === "true"
        this.listenForTabChanges()
    }

    async onInput(exstr) {
        return this.updateOptions(exstr)
    }

    async filter(exstr) {
        this.lastExstr = exstr
        return this.onInput(exstr)
    }

    setStateFromScore(scoredOpts: Completions.ScoredOption[]) {
        super.setStateFromScore(scoredOpts, this.shouldSetStateFromScore)
    }

    /**
     * Gets the next option in this BufferCompletionSource assuming
     * that this BufferCompletionSource length has been reduced by 1
     *
     * TODO: this ain't going to work, need to work out position based on win.tab
     */
    // private getTheNextTabOption(option: TabAllCompletionOption) {
    //     if (option.tab.index === this.options.length) {
    //         return this.options[this.options.length - 1]
    //     }
    //     return this.options[option.tab.index]
    // }

    // Eslint doesn't like this decorator but there's nothing we can do about it
    // eslint-disable-next-line @typescript-eslint/member-ordering
    @Perf.measuredAsync
    private async updateOptions(exstr = "", preserveSelection = false) {
        const generation = this.beginUpdate()
        this.lastExstr = exstr
        const [prefix] = this.splitOnPrefix(exstr)

        // Hide self and stop if prefixes don't match
        const wasHidden = this.state === "hidden"
        if (prefix) {
            // Show self if prefix and currently hidden
            if (this.state === "hidden") {
                this.state = "normal"
            }
        } else {
            this.state = "hidden"
            return
        }

        const optionSet =
            this.canonicalisePrefix(prefix) === "tabgrab" ? "tabgrab" : "taball"
        if (!this.optionsDirty && !wasHidden && this.optionSet === optionSet) {
            this.completion = undefined
            this.updateChain()
            return
        }

        const mru = config.get("tabsort") == "mru"
        const [tabs, altTab, containerList] = await Promise.all([
            getSortedTabs(mru ? "mru" : "default", true),
            prevActiveTab(),
            browserBg.contextualIdentities.query({}).catch(() => []),
        ])
        let currentWindow: { id?: number }
        if (await compat.isAndroid()) {
            currentWindow = { id: tabs.find(tab => tab.active)?.windowId }
        } else {
            // eslint-disable-next-line unsupported-apis-firefox-android
            currentWindow = await browserBg.windows.getCurrent()
        }
        if (!this.isCurrentUpdate(generation)) return

        if (!mru) {
            tabs.sort((a, b) => {
                if (a.windowId === b.windowId) return a.index - b.index
                return a.windowId - b.windowId
            })
        }

        // Check to see if this is a command that needs to exclude the current
        // window
        const excludeCurrentWindow = optionSet === "tabgrab"
        const windowIndices = new Map(
            [...new Set(tabs.map(tab => tab.windowId))]
                .sort((a, b) => a - b)
                .map((windowId, index) => [windowId, index + 1]),
        )
        const includedTabs = tabs.filter(
            tab => !excludeCurrentWindow || tab.windowId !== currentWindow.id,
        )
        const tabGroups = await Promise.all(
            includedTabs.map(tab =>
                tabTgroup(tab.id).catch(() => undefined),
            ),
        )
        const containerMap = new Map()
        containerList.forEach(container =>
            containerMap.set(container.cookieStoreId, container),
        )
        if (!this.isCurrentUpdate(generation)) return
        const options = includedTabs.map(
            (tab, index) =>
                new TabAllCompletionOption(
                    tab.id.toString(),
                    tab,
                    tab.id === altTab?.id,
                    tab.active && tab.windowId === currentWindow.id,
                    windowIndices.get(tab.windowId),
                    containerMap.get(tab.cookieStoreId) ||
                        Containers.DefaultContainer,
                    tab.incognito,
                    tabGroups[index],
                ),
        )

        const lastFocused = this.lastFocused as TabAllCompletionOption
        const wasFocused = preserveSelection && lastFocused?.state === "focused"
        const oldIndex = wasFocused
            ? (this.options || [])
                  .filter(o => o.state !== "hidden")
                  .indexOf(lastFocused)
            : -1
        this.completion = undefined
        this.options = options
        this.optionSet = optionSet
        this.optionsDirty = false
        this.updateChain()
        if (wasFocused) {
            const visibleOptions = this.options.filter(o => o.state !== "hidden")
            const option =
                visibleOptions.find(o => o.tabId === lastFocused.tabId) ||
                visibleOptions[Math.min(oldIndex, visibleOptions.length - 1)]
            if (option) {
                this.deselect()
                this.select(option)
            }
        }
    }

    protected refreshForTabChanges() {
        return this.updateOptions(this.lastExstr, true)
    }
}

import * as Perf from "@src/perf"
import { browserBg, prevActiveTab } from "@src/lib/webext"
import * as Containers from "@src/lib/containers"
import * as Completions from "@src/completions"
import * as Messaging from "@src/lib/messaging"
import * as config from "@src/lib/config"
import { tabTgroup } from "@src/lib/tab_groups"

class TabAllCompletionOption
    extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []
    public tab: browser.tabs.Tab
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
        const valueStr = `${winindex}.${tab.index + 1}`
        this.value = valueStr
        this.fuseKeys.push(this.value, tab.title, tab.url)
        this.tab = tab

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
        this.html = html`<tr
            class="BufferAllCompletionOption option container_${container.color} container_${container.icon} container_${container.name} ${incognito
                ? "incognito"
                : ""}"
        >
            <td class="prefix">${pre}</td>
            <td class="prefixplain" hidden>${preplain}</td>
            <td class="privatewindow"></td>
            <td class="container"></td>
            <td class="icon"><img src="${favIconUrl}" /></td>
            <td class="title">${valueStr}: ${tab.title}</td>
            <td class="content">
                <a class="url" target="_blank" href=${tab.url}>${tab.url}</a>
            </td>
            <td class="tgroup">${tgroupname}</td>
        </tr>`
    }
}

export class TabAllCompletionSource extends Completions.CompletionSourceFuse {
    public options: TabAllCompletionOption[]
    private shouldSetStateFromScore = true

    constructor(private _parent) {
        super(["taball", "tabgrab"], "TabAllCompletionSource", "All Tabs")

        this.updateOptions()
        this._parent.appendChild(this.node)
        this.shouldSetStateFromScore =
            config.get("completions", "TabAll", "autoselect") === "true"

        Messaging.addListener("tab_changes", () => this.reactToTabChanges())
    }

    async onInput(exstr) {
        return this.updateOptions(exstr)
    }

    setStateFromScore(scoredOpts: Completions.ScoredOption[]) {
        super.setStateFromScore(scoredOpts, this.shouldSetStateFromScore)
    }

    /**
     * Map all windows into a {[windowId]: window} object
     */
    private async getWindows() {
        const windows = await browserBg.windows.getAll()
        const response: { [windowId: number]: browser.windows.Window } = {}
        windows.forEach(win => (response[win.id] = win))
        return response
    }

    /**
     * Update the list of possible tab options and select (focus on)
     * the appropriate option.
     */
    private async reactToTabChanges(): Promise<void> {
        // const prevOptions = this.options
        await this.updateOptions(this.lastExstr)

        // TODO: update this from Tab.ts for TabAll.ts
        // if (!prevOptions || !this.options || !this.lastFocused) return

        // // Determine which option to focus on
        // const diff = R.differenceWith(
        //     (x, y) => x.tab.id === y.tab.id,
        //     prevOptions,
        //     this.options,
        // )
        // const lastFocusedTabCompletion = this
        //     .lastFocused as TabAllCompletionOption

        // // If the focused option was removed then focus on the next option
        // if (
        //    diff.length === 1 &&
        //    diff[0].tab.id === lastFocusedTabCompletion.tab.id
        // ) {
        //    //this.select(this.getTheNextTabOption(lastFocusedTabCompletion))
        // }
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
    private async updateOptions(exstr = "") {
        this.lastExstr = exstr
        const [prefix] = this.splitOnPrefix(exstr)

        // Hide self and stop if prefixes don't match
        if (prefix) {
            // Show self if prefix and currently hidden
            if (this.state === "hidden") {
                this.state = "normal"
            }
        } else {
            this.state = "hidden"
            return
        }

        const tabsPromise = browserBg.tabs.query({})
        const windowsPromise = this.getWindows()
        const [tabs, windows] = await Promise.all([tabsPromise, windowsPromise])

        const options = []

        tabs.sort((a, b) => {
            if (a.windowId === b.windowId) return a.index - b.index
            return a.windowId - b.windowId
        })

        const altTab = await prevActiveTab()

        // Check to see if this is a command that needs to exclude the current
        // window
        const excludeCurrentWindow = ["tabgrab"].includes(prefix.trim())
        const currentWindow = await browserBg.windows.getCurrent()
        // Window Ids don't make sense so we're using LASTID and WININDEX to compute a window index
        // This relies on the fact that tabs are sorted by window ids
        let lastId = 0
        let winindex = 0
        for (const tab of tabs) {
            if (lastId !== tab.windowId) {
                lastId = tab.windowId
                winindex += 1
            }
            // if we are excluding the current window and this tab is in the current window
            // then skip it
            if (excludeCurrentWindow && tab.windowId === currentWindow.id)
                continue
            options.push(
                new TabAllCompletionOption(
                    tab.id.toString(),
                    tab,
                    tab.index === altTab.index &&
                        tab.windowId === altTab.windowId,
                    tab.active &&
                        tab.windowId === currentWindow.id,
                    winindex,
                    await Containers.getFromId(tab.cookieStoreId),
                    windows[tab.windowId].incognito,
                    await tabTgroup(tab.id),
                ),
            )
        }

        this.completion = undefined
        this.options = options
        return this.updateChain()
    }
}

import * as Perf from "@src/perf"
import { browserBg, getSortedTabs, prevActiveTab } from "@src/lib/webext"
import { enumerate } from "@src/lib/itertools"
import * as Containers from "@src/lib/containers"
import * as Completions from "@src/completions"
import * as config from "@src/lib/config"
import * as Messaging from "@src/lib/messaging"

class BufferCompletionOption
    extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []
    public tabId: number

    constructor(
        public value: string,
        tab: browser.tabs.Tab,
        public isAlternative = false,
        container: browser.contextualIdentities.ContextualIdentity,
        public tabIndex: number,
        titlePrefix: number,
    ) {
        super()

        this.tabId = tab.id

        // pre contains max four uppercase characters for tab status.
        // If statusstylepretty is set to true replace use unicode characters,
        // but keep plain letters in hidden column for completion.
        let preplain = ""
        if (tab.active) preplain += "%"
        else if (isAlternative) {
            preplain += "#"
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

        // Push prefix before padding so we don't match on whitespace
        this.fuseKeys.push(pre)
        this.fuseKeys.push(preplain)

        // Push properties we want to fuzmatch on
        this.fuseKeys.push(String(titlePrefix), tab.title, tab.url)

        // Create HTMLElement
        const favIconUrl = tab.favIconUrl
            ? tab.favIconUrl
            : Completions.DEFAULT_FAVICON
        const indicator = tab.audible ? String.fromCodePoint(0x1f50a) : ""
        this.html = html`<tr
            class="BufferCompletionOption option container_${container.color} container_${container.icon} container_${container.name}"
        >
            <td class="prefix">${pre}</td>
            <td class="prefixplain" hidden>${preplain}</td>
            <td class="container"></td>
            <td class="icon"><img loading="lazy" src="${favIconUrl}" /></td>
            <td class="title">${titlePrefix}: ${indicator} ${tab.title}</td>
            <td class="content">
                <a class="url" target="_blank" href=${tab.url}>${tab.url}</a>
            </td>
        </tr>`
    }
}

abstract class BufferCompletionSource extends Completions.CompletionSourceFuse {
    public options: BufferCompletionOption[]
    private shouldSetStateFromScore = true

    // TODO:
    //     - store the exstr and trigger redraws on user or data input without
    //       callback faffery
    //     - sort out the element redrawing.

    constructor(_parent, prefixes: string[], className: string) {
        super(prefixes, className, "Tabs")
        this.sortScoredOptions = true
        this.shouldSetStateFromScore =
            config.get("completions", "Tab", "autoselect") === "true"
        this.updateOptions()
        _parent.appendChild(this.node)

        Messaging.addListener("tab_changes", () => this.reactToTabChanges())
    }

    async onInput(exstr) {
        // Schedule an update, if you like. Not very useful for tabs, but
        // will be for other things.
        return this.updateOptions(exstr)
    }

    async filter(exstr) {
        this.lastExstr = exstr
        const prefix = this.splitOnPrefix(exstr).shift()
        if (prefix === "tabrename") this.shouldSetStateFromScore = false
        return this.onInput(exstr)
    }

    setStateFromScore(scoredOpts: Completions.ScoredOption[]) {
        super.setStateFromScore(scoredOpts, this.shouldSetStateFromScore)
    }

    /** Score with fuse unless query is a single # or looks like a tab index */
    scoredOptions(
        query: string,
        options = this.options,
    ): Completions.ScoredOption[] {
        const args = query.trim().split(/\s+/gu)
        if (args.length === 1) {
            const arg = args[0]
            if (arg === "#") {
                return this.optionsLike(option => option.isAlternative, options)
            }

            const searchId = Number(arg)
            if (Number.isInteger(searchId)) {
                return this.optionsBySearchId(searchId, options)
            }
        }

        // If not yet returned...
        return super.scoredOptions(query)
    }

    protected optionsLike(
        predicate: (o: BufferCompletionOption) => boolean,
        options: BufferCompletionOption[],
    ): Completions.ScoredOption[] {
        const result = []
        for (const [index, option] of enumerate(options)) {
            if (predicate(option)) {
                result.push({
                    index,
                    option,
                    score: 0,
                })
            }
        }
        return result
    }

    private async fillOptions(prefix: string) {
        // Get alternative tab, defined as last accessed tab in any group in
        // this window.

        const altTab = await prevActiveTab()
        // Since tabmove always uses absolute tab indices, we need
        // to override possible MRU setting to match tabmove behavior
        const forceSort = prefix === "tabmove" ? "default" : undefined
        const tabs = await getSortedTabs(forceSort)
        const options = []

        const container_all = await browserBg.contextualIdentities.query({})
        const container_map = new Map()
        container_all.forEach(elem =>
            container_map.set(elem.cookieStoreId, elem),
        )
        // firefox-default is not in contextualIdenetities
        container_map.set("firefox-default", Containers.DefaultContainer)
        for (const [index, tab] of tabs.entries()) {
            let tab_container = container_map.get(tab.cookieStoreId)
            if (!tab_container) {
                tab_container = Containers.DefaultContainer
            }
            const isAlternative = tab.index === altTab.index
            const titlePrefix = this.titlePrefix(index, tab)
            options.push(
                new BufferCompletionOption(
                    this.completionValue(titlePrefix, isAlternative),
                    tab,
                    isAlternative,
                    tab_container,
                    index,
                    titlePrefix,
                ),
            )
        }

        this.options = options
    }

    // Eslint doesn't like this decorator but there's nothing we can do about it
    // eslint-disable-next-line @typescript-eslint/member-ordering
    @Perf.measuredAsync
    private async updateOptions(exstr = "") {
        this.lastExstr = exstr
        const [prefix, query] = this.splitOnPrefix(exstr)

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

        // When the user is asking for tabmove completions, don't autoselect if the query looks like a relative move https://github.com/tridactyl/tridactyl/issues/825
        if (prefix === "tabmove")
            this.shouldSetStateFromScore = !/^[+-][0-9]+$/.exec(query)

        await this.fillOptions(prefix)
        this.completion = undefined

        /* console.log('updateOptions', this.optionContainer) */
        if (query && query.trim().length > 0) {
            this.setStateFromScore(this.scoredOptions(query))
        } else {
            this.options.forEach(option => (option.state = "normal"))
        }
        return this.updateDisplay()
    }

    /**
     * Update the list of possible tab options and select (focus on)
     * the appropriate option.
     */
    private async reactToTabChanges(): Promise<void> {
        const prevOptions = this.options
        await this.updateOptions(this.lastExstr)

        if (!prevOptions || !this.options || !this.lastFocused) return

        // Determine which option to focus on
        const diff: BufferCompletionOption[] = []
        for (const prevOption of prevOptions) {
            if (
                !this.options.find(
                    newOption => prevOption.tabId === newOption.tabId,
                )
            )
                diff.push(prevOption)
        }
        const lastFocusedTabCompletion = this
            .lastFocused as BufferCompletionOption

        // If the focused option was removed then focus on the next option
        if (
            diff.length === 1 &&
            diff[0].tabId === lastFocusedTabCompletion.tabId
        ) {
            this.select(this.getTheNextTabOption(lastFocusedTabCompletion))
        }
    }

    /**
     * Gets the next option in this BufferCompletionSource assuming
     * that this BufferCompletionSource length has been reduced by 1
     */
    private getTheNextTabOption(option: BufferCompletionOption) {
        if (option.tabIndex === this.options.length) {
            return this.options[this.options.length - 1]
        }
        return this.options[option.tabIndex]
    }

    /**
     * Provide identifier, which will be used before tab title in the completion option.
     * @param index of the tab calculated by Tridactyl
     * @param tab Tab
     */
    protected abstract titlePrefix(index: number, tab: browser.tabs.Tab): number

    /**
     * Provide value, which will be used on tab completion (i.e. when user selects tab option using <Space> or <Enter>).
     * @param titlePrefix identifier user before tab title
     * @param isAlternative marker if completion value is for previous tab
     */
    protected abstract completionValue(
        titlePrefix: number,
        isAlternative: boolean,
    ): string

    /**
     * Filter list of options by option identifier.
     * @param searchId identifier of the option
     * @param options list of options to search through
     */
    protected abstract optionsBySearchId(
        searchId: number,
        options: BufferCompletionOption[],
    ): Completions.ScoredOption[]
}

export class LinearBufferCompletionSource extends BufferCompletionSource {
    constructor(_parent) {
        super(
            _parent,
            [
                "tab",
                "tabclose",
                "tabdetach",
                "tabduplicate",
                "tabmove",
                "tabrename",
                "tabdiscard",
                "pin",
            ],
            "LinearBufferCompletionSource",
        )
    }

    protected titlePrefix(index: number, _tab: browser.tabs.Tab): number {
        return index + 1
    }

    protected completionValue(
        titlePrefix: number,
        isAlternative: boolean,
    ): string {
        if (isAlternative) {
            return "#"
        }
        return String(titlePrefix)
    }

    protected optionsBySearchId(
        searchId: number,
        options: BufferCompletionOption[],
    ): Completions.ScoredOption[] {
        const index = (searchId - 1).mod(options.length)
        options.sort((a, b) => a.tabIndex - b.tabIndex)
        return this.tabScoredOptionsStartsWithN(index, options)
    }

    /** Return the scoredOption[] result for the tab index startswith n */
    private tabScoredOptionsStartsWithN(
        n: number,
        options: BufferCompletionOption[],
    ): Completions.ScoredOption[] {
        const nstr = (n + 1).toString()
        return this.optionsLike(
            option => (option.tabIndex + 1).toString().startsWith(nstr),
            options,
        )
    }
}

/**
 * TST specifics for tab completion.
 *
 * At the moment the only difference to linear tabs is that TST source uses tab
 * ID in place of tab index for identification.
 */
export class BufferTreeCompletionSource extends BufferCompletionSource {
    constructor(_parent) {
        super(
            _parent,
            ["tstmove", "tstmoveafter", "tstattach"],
            "BufferTreeCompletionSource",
        )
    }

    protected titlePrefix(_index: number, tab: browser.tabs.Tab): number {
        return tab.id
    }

    protected completionValue(
        titlePrefix: number,
        _isAlternative: boolean,
    ): string {
        return String(titlePrefix)
    }

    protected optionsBySearchId(
        searchId: number,
        options: BufferCompletionOption[],
    ): Completions.ScoredOption[] {
        return this.optionsLike(option => option.tabId === searchId, options)
    }
}

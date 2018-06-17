/*

Have an array of all completion sources. Completion sources display nothing if the filter doesn't match for them.

On each input event, call updateCompletions on the array. That will mutate the array and update the display as required.

How to handle cached e.g. buffer information going out of date?

*/

import * as Fuse from "fuse.js"
import { enumerate } from "./itertools"
import { toNumber } from "./convert"
import * as Messaging from "./messaging"
import * as config from "./config"
import { browserBg } from "./lib/webext"

const DEFAULT_FAVICON = browser.extension.getURL("static/defaultFavicon.svg")

// {{{ INTERFACES

type OptionState = "focused" | "hidden" | "normal"

abstract class CompletionOption {
    /** What to fill into cmdline */
    value: string
    /** Control presentation of the option */
    state: OptionState
}

export abstract class CompletionSource {
    readonly options: CompletionOption[]
    node: HTMLElement
    public completion: string

    /** Update [[node]] to display completions relevant to exstr */
    public abstract filter(exstr: string): Promise<void>

    private _state: OptionState

    /** Control presentation of Source */
    set state(newstate: OptionState) {
        switch (newstate) {
            case "normal":
                this.node.classList.remove("hidden")
                this.completion = undefined
                break
            case "hidden":
                this.node.classList.add("hidden")
                break
        }
        this._state = newstate
    }

    get state() {
        return this._state
    }

    abstract next(inc?: number): boolean

    prev(inc = 1): boolean {
        return this.next(-1 * inc)
    }
}

// Default classes

abstract class CompletionOptionHTML extends CompletionOption {
    public html: HTMLElement
    public value

    private _state: OptionState = "hidden"

    /** Control presentation of element */
    set state(newstate: OptionState) {
        // console.log("state from to", this._state, newstate)
        switch (newstate) {
            case "focused":
                this.html.classList.add("focused")
                this.html.scrollIntoView()
                this.html.classList.remove("hidden")
                break
            case "normal":
                this.html.classList.remove("focused")
                this.html.classList.remove("hidden")
                break
            case "hidden":
                this.html.classList.remove("focused")
                this.html.classList.add("hidden")
                break
        }
        this._state = newstate
    }

    get state() {
        return this._state
    }
}

interface CompletionOptionFuse extends CompletionOptionHTML {
    // For fuzzy matching
    fuseKeys: any[]
}

type ScoredOption = {
    index: number
    option: CompletionOptionFuse
    score: number
}

abstract class CompletionSourceFuse extends CompletionSource {
    public node
    public options: CompletionOptionFuse[]
    protected lastExstr: string
    protected lastFocused: CompletionOption

    protected optionContainer = html`<table class="optionContainer">`

    constructor(private prefixes, className: string, title?: string) {
        super()
        this.node = html`<div class="${className} hidden">
                <div class="sectionHeader">${title || className}</div>
            </div>`
        this.node.appendChild(this.optionContainer)
        this.state = "hidden"
    }

    /* abstract onUpdate(query: string, prefix: string, options: CompletionOptionFuse[]) */
    abstract onInput(exstr: string)

    // Helpful default implementations

    public async filter(exstr: string) {
        this.lastExstr = exstr
        this.onInput(exstr)
        this.updateChain()
    }

    updateChain(exstr = this.lastExstr, options = this.options) {
        if (options === undefined) {
            this.state = "hidden"
            return
        }

        const [prefix, query] = this.splitOnPrefix(exstr)

        // console.log(prefix, query, options)

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

        // Filter by query if query is not empty
        if (query) {
            this.setStateFromScore(this.scoredOptions(query))
            // Else show all options
        } else {
            options.forEach(option => (option.state = "normal"))
        }

        // Call concrete class
        this.updateDisplay()
    }

    select(option: CompletionOption) {
        if (this.lastExstr !== undefined && option !== undefined) {
            const [prefix, _] = this.splitOnPrefix(this.lastExstr)
            this.completion = prefix + option.value
            option.state = "focused"
            this.lastFocused = option
        } else {
            throw new Error("lastExstr and option must be defined!")
        }
    }

    deselect() {
        this.completion = undefined
        if (this.lastFocused != undefined) this.lastFocused.state = "normal"
    }

    splitOnPrefix(exstr: string) {
        for (const prefix of this.prefixes) {
            if (exstr.startsWith(prefix)) {
                const query = exstr.replace(prefix, "")
                return [prefix, query]
            }
        }
        return [undefined, undefined]
    }

    fuseOptions = {
        keys: ["fuseKeys"],
        shouldSort: true,
        id: "index",
        includeScore: true,
    }

    // PERF: Could be expensive not to cache Fuse()
    // yeah, it was.
    fuse = undefined

    /** Rtn sorted array of {option, score} */
    scoredOptions(query: string, options = this.options): ScoredOption[] {
        // This is about as slow.
        let USE_FUSE = true
        if (!USE_FUSE) {
            const searchThis = this.options.map((elem, index) => {
                return { index, fuseKeys: elem.fuseKeys[0] }
            })

            return searchThis.map(r => {
                return {
                    index: r.index,
                    option: this.options[r.index],
                    score: r.fuseKeys.length,
                }
            })
        } else {
            // Can't sort the real options array because Fuse loses class information.

            if (!this.fuse) {
                let searchThis = this.options.map((elem, index) => {
                    return { index, fuseKeys: elem.fuseKeys }
                })

                this.fuse = new Fuse(searchThis, this.fuseOptions)
            }
            return this.fuse.search(query).map(res => {
                let result = res as any
                // console.log(result, result.item, query)
                let index = toNumber(result.item)
                return {
                    index,
                    option: this.options[index],
                    score: result.score as number,
                }
            })
        }
    }

    /** Set option state by score

        For now just displays all scored elements (see threshold in fuse) and
        focus the best match.
    */
    setStateFromScore(scoredOpts: ScoredOption[], autoselect = false) {
        let matches = scoredOpts.map(res => res.index)

        for (const [index, option] of enumerate(this.options)) {
            if (matches.includes(index)) option.state = "normal"
            else option.state = "hidden"
        }

        // ideally, this would not deselect anything unless it fell off the list of matches
        if (matches.length && autoselect) {
            this.select(this.options[matches[0]])
        } else {
            this.deselect()
        }
    }

    /** Call to replace the current display */
    // TODO: optionContainer.replaceWith and optionContainer.remove don't work.
    // I don't know why, but it means we can't replace the div in one go. Maybe
    // an iframe thing.
    updateDisplay() {
        /* const newContainer = html`<div>` */

        while (this.optionContainer.hasChildNodes()) {
            this.optionContainer.removeChild(this.optionContainer.lastChild)
        }

        for (const option of this.options) {
            /* newContainer.appendChild(option.html) */
            if (option.state != "hidden")
                this.optionContainer.appendChild(option.html)
        }

        /* console.log('updateDisplay', this.optionContainer, newContainer) */

        /* let result1 = this.optionContainer.remove() */
        /* let res2 = this.node.appendChild(newContainer) */
        /* console.log('results', result1, res2) */
    }

    next(inc = 1) {
        if (this.state != "hidden") {
            let visopts = this.options.filter(o => o.state != "hidden")
            let currind = visopts.findIndex(o => o.state == "focused")
            this.deselect()
            // visopts.length + 1 because we want an empty completion at the end
            let max = visopts.length + 1
            let opt = visopts[(currind + inc + max) % max]
            if (opt) this.select(opt)
            return true
        } else return false
    }
}

// }}}

// {{{ IMPLEMENTATIONS

class HistoryCompletionOption extends CompletionOptionHTML
    implements CompletionOptionFuse {
    public fuseKeys = []

    constructor(public value: string, page: browser.history.HistoryItem) {
        super()
        if (!page.title) {
            page.title = new URL(page.url).host
        }

        // Push properties we want to fuzmatch on
        this.fuseKeys.push(page.title, page.url) // weight by page.visitCount

        // Create HTMLElement
        // need to download favicon
        const favIconUrl = DEFAULT_FAVICON
        // const favIconUrl = tab.favIconUrl ? tab.favIconUrl : DEFAULT_FAVICON
        this.html = html`<tr class="HistoryCompletionOption option">
            <td class="prefix">${"".padEnd(2)}</td>
            <td></td>
            <td>${page.title}</td>
            <td><a class="url" target="_blank" href=${page.url}>${
            page.url
        }</a></td>
        </tr>`
    }
}

class BmarkCompletionOption extends CompletionOptionHTML
    implements CompletionOptionFuse {
    public fuseKeys = []

    constructor(
        public value: string,
        bmark: browser.bookmarks.BookmarkTreeNode,
    ) {
        super()
        if (!bmark.title) {
            bmark.title = new URL(bmark.url).host
        }

        // Push properties we want to fuzmatch on
        this.fuseKeys.push(bmark.title, bmark.url)

        // Create HTMLElement
        // need to download favicon
        const favIconUrl = DEFAULT_FAVICON
        // const favIconUrl = tab.favIconUrl ? tab.favIconUrl : DEFAULT_FAVICON
        this.html = html`<tr class="HistoryCompletionOption option">
            <td class="prefix">${"".padEnd(2)}</td>
            <td></td>
            <td>${bmark.title}</td>
            <td><a class="url" target="_blank" href=${bmark.url}>${
            bmark.url
        }</a></td>
        </tr>`
    }
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export class BmarkCompletionSource extends CompletionSourceFuse {
    public options: BmarkCompletionOption[]

    constructor(private _parent) {
        super(["bmarks "], "BmarkCompletionSource", "Bookmarks")

        this._parent.appendChild(this.node)
    }

    public async filter(exstr: string) {
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

        this.options = (await this.scoreOptions(query, 10)).map(
            page => new BmarkCompletionOption(page.url, page),
        )

        this.updateChain()
    }

    updateChain() {
        // Options are pre-trimmed to the right length.
        this.options.forEach(option => (option.state = "normal"))

        // Call concrete class
        this.updateDisplay()
    }

    onInput() {}

    private async scoreOptions(query: string, n: number) {
        // Search bookmarks, dedupe and sort by frecency
        let bookmarks = await browserBg.bookmarks.search({ query })
        bookmarks = bookmarks.filter(b => {
            try {
                return new URL(b.url)
            } catch (e) {
                return false
            }
        })

        bookmarks.sort((a, b) => b.dateAdded - a.dateAdded)

        return bookmarks.slice(0, n)
    }

    select(option: CompletionOption) {
        if (this.lastExstr !== undefined && option !== undefined) {
            this.completion = "open " + option.value
            option.state = "focused"
            this.lastFocused = option
        } else {
            throw new Error("lastExstr and option must be defined!")
        }
    }
}

export class HistoryCompletionSource extends CompletionSourceFuse {
    public options: HistoryCompletionOption[]

    constructor(private _parent) {
        super(
            ["open ", "tabopen ", "winopen "],
            "HistoryCompletionSource",
            "History",
        )

        this._parent.appendChild(this.node)
    }

    public async filter(exstr: string) {
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

        this.options = (await this.scoreOptions(query, 10)).map(
            page => new HistoryCompletionOption(page.url, page),
        )

        this.updateChain()
    }

    updateChain() {
        // Options are pre-trimmed to the right length.
        this.options.forEach(option => (option.state = "normal"))

        // Call concrete class
        this.updateDisplay()
    }

    onInput() {}

    private frecency(item: browser.history.HistoryItem) {
        // Doesn't actually care about recency yet.
        return item.visitCount * -1
    }

    private async scoreOptions(query: string, n: number) {
        const newtab = browser.runtime.getManifest()["chrome_url_overrides"]
            .newtab
        const newtaburl = browser.extension.getURL(newtab)
        if (!query) {
            return (await browserBg.topSites.get())
                .filter(page => page.url !== newtaburl)
                .slice(0, n)
        } else {
            // Search history, dedupe and sort by frecency
            let history = await browserBg.history.search({
                text: query,
                maxResults: Number(config.get("historyresults")),
                startTime: 0,
            })

            // Remove entries with duplicate URLs
            const dedupe = new Map()
            for (const page of history) {
                if (page.url !== newtaburl) {
                    if (dedupe.has(page.url)) {
                        if (
                            dedupe.get(page.url).title.length <
                            page.title.length
                        ) {
                            dedupe.set(page.url, page)
                        }
                    } else {
                        dedupe.set(page.url, page)
                    }
                }
            }
            history = [...dedupe.values()]

            history.sort((a, b) => this.frecency(a) - this.frecency(b))

            return history.slice(0, n)
        }
    }
}

class BufferCompletionOption extends CompletionOptionHTML
    implements CompletionOptionFuse {
    public fuseKeys = []

    constructor(
        public value: string,
        tab: browser.tabs.Tab,
        public isAlternative = false,
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
        const favIconUrl = tab.favIconUrl ? tab.favIconUrl : DEFAULT_FAVICON
        this.html = html`<tr class="BufferCompletionOption option">
            <td class="prefix">${pre.padEnd(2)}</td>
            <td><img src=${favIconUrl} /></td>
            <td>${tab.index + 1}: ${tab.title}</td>
            <td><a class="url" target="_blank" href=${tab.url}>${
            tab.url
        }</a></td>
        </tr>`
    }
}

export class BufferCompletionSource extends CompletionSourceFuse {
    public options: BufferCompletionOption[]

    // TODO:
    //     - store the exstr and trigger redraws on user or data input without
    //       callback faffery
    //     - sort out the element redrawing.

    constructor(private _parent) {
        super(
            ["buffer ", "tabclose ", "tabdetach ", "tabduplicate ", "tabmove "],
            "BufferCompletionSource",
            "Buffers",
        )

        this.updateOptions()
        this._parent.appendChild(this.node)
    }

    private async updateOptions(exstr?: string) {
        /* console.log('updateOptions', this.optionContainer) */
        const tabs: browser.tabs.Tab[] = await Messaging.message(
            "commandline_background",
            "currentWindowTabs",
        )

        const options = []

        // Get alternative tab, defined as last accessed tab.
        const alt = tabs.sort((a, b) => {
            return a.lastAccessed < b.lastAccessed ? 1 : -1
        })[1]
        tabs.sort((a, b) => {
            return a.index < b.index ? -1 : 1
        })

        for (const tab of tabs) {
            options.push(
                new BufferCompletionOption(
                    (tab.index + 1).toString(),
                    tab,
                    tab === alt,
                ),
            )
        }

        /* console.log('updateOptions end', this.waiting, this.optionContainer) */
        this.options = options
        this.updateChain()
    }

    async onInput(exstr) {
        // Schedule an update, if you like. Not very useful for buffers, but
        // will be for other things.
        this.updateOptions()
    }

    setStateFromScore(scoredOpts: ScoredOption[]) {
        super.setStateFromScore(scoredOpts, true)
    }

    /** Score with fuse unless query is a single # or looks like a buffer index */
    scoredOptions(query: string, options = this.options): ScoredOption[] {
        const args = query.trim().split(/ +/gu)
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

// {{{ UNUSED: MANAGING ASYNC CHANGES

/** If first to modify epoch, commit change. May want to change epoch after commiting. */
async function commitIfCurrent(
    epochref: any,
    asyncFunc: Function,
    commitFunc: Function,
    ...args: any[]
): Promise<any> {
    // I *think* sync stuff in here is guaranteed to happen immediately after
    // being called, up to the first await, despite this being an async
    // function. But I don't know. Should check.
    const epoch = epochref
    const res = await asyncFunc(...args)
    if (epoch === epochref) return commitFunc(res)
    else console.error(new Error("Update failed: epoch out of date!"))
}

/** Indicate changes to completions we would like.

    This will probably never be used for original designed purpose.
*/
function updateCompletions(filter: string, sources: CompletionSource[]) {
    for (let [index, source] of enumerate(sources)) {
        // Tell each compOpt to filter, and if they finish fast enough they:
        //      0. Leave a note for any siblings that they got here first
        //      1. Take over their parent's slot in compOpts
        //      2. Update their display
        commitIfCurrent(
            source.obsolete, // Flag/epoch
            source.filter, // asyncFunc
            childSource => {
                // commitFunc
                source.obsolete = true
                sources[index] = childSource
                childSource.activate()
            },
            filter, // argument to asyncFunc
        )
    }
}

// }}}

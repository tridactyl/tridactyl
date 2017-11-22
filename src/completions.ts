/*

Have an array of all completion sources. Completion sources display nothing if the filter doesn't match for them.

On each input event, call updateCompletions on the array. That will mutate the array and update the display as required.

How to handle cached e.g. buffer information going out of date?

*/


import * as Fuse from 'fuse.js'
import {enumerate} from './itertools'
import {toNumber} from './convert'
import * as Messaging from './messaging'

const DEFAULT_FAVICON = browser.extension.getURL("static/defaultFavicon.svg")

// {{{ INTERFACES

type OptionState = 'focused' | 'hidden' | 'normal'

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
            case 'normal':
                this.node.classList.remove('hidden')
                this.completion = undefined
                break
            case 'hidden':
                this.node.classList.add('hidden')
                break;
        }
        this._state = newstate
    }

    get state() {
        return this._state
    }
}

// Default classes

abstract class CompletionOptionHTML extends CompletionOption {
    public html: HTMLElement
    public value

    private _state: OptionState = 'hidden'

    /** Control presentation of element */
    set state(newstate: OptionState) {
        console.log("state from to", this._state, newstate)
        switch (newstate) {
            case 'focused':
                this.html.classList.add('focused')
                this.html.classList.remove('hidden')
                break
            case 'normal':
                this.html.classList.remove('focused')
                this.html.classList.remove('hidden')
                break
            case 'hidden':
                this.html.classList.remove('focused')
                this.html.classList.add('hidden')
                break;
        }
    }
}

interface CompletionOptionFuse extends CompletionOptionHTML {
    // For fuzzy matching
    fuseKeys: any[]
}

type ScoredOption = {
    index: number,
    option: CompletionOptionFuse,
    score: number
}

abstract class CompletionSourceFuse extends CompletionSource {
    public node
    public options: CompletionOptionFuse[]
    protected lastExstr: string

    protected optionContainer = html`<div class="optionContainer">`

    constructor(private prefixes, className: string, title?: string) {
        super()
        this.node = html
            `<div class="${className} hidden">
                <div class="sectionHeader">${title || className}</div>
            </div>`
        this.node.appendChild(this.optionContainer)
        this.state = 'hidden'
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
            this.state = 'hidden'
            return
        }

        const [prefix, query] = this.splitOnPrefix(exstr)

        console.log(prefix, query, options)

        // Hide self and stop if prefixes don't match
        if (prefix) {
            // Show self if prefix and currently hidden
            if (this.state === 'hidden') {
                this.state = 'normal'
            }
        } else {
            this.state = 'hidden'
            return
        }

        // Filter by query if query is not empty
        if (query) {
            this.setStateFromScore(this.scoredOptions(query))
        // Else show all options
        } else {
            options.forEach(option => option.state = 'normal')
        }

        // Call concrete class
        this.updateDisplay()
    }

    select(option: CompletionOption) {
        if (this.lastExstr !== undefined && option !== undefined) {
            const [prefix, _] = this.splitOnPrefix(this.lastExstr)
            this.completion = prefix + option.value
            option.state = 'focused'
        } else {
            throw new Error("lastExstr and option must be defined!")
        }
    }

    deselect() {
        this.completion = undefined
    }

    splitOnPrefix(exstr: string) {
        for (const prefix of this.prefixes) {
            if (exstr.startsWith(prefix)) {
                const query = exstr.replace(prefix, '')
                return [prefix, query]
            }
        }
        return [undefined, undefined]
    }

    /** Rtn sorted array of {option, score} */
    scoredOptions(query: string, options = this.options): ScoredOption[] {
        const fuseOptions = {
            keys: ["fuseKeys"],
            shouldSort: true,
            id: "index",
            includeScore: true,
        }

        // Can't sort the real options array because Fuse loses class information.
        const searchThis = this.options.map(
            (elem, index) => {
                return {index, fuseKeys: elem.fuseKeys}
            })

        // PERF: Could be expensive not to cache Fuse()
        const fuse = new Fuse(searchThis, fuseOptions)
        return fuse.search(query).map(
            res => {
                let result = res as any
                console.log(result, result.item, query)
                let index = toNumber(result.item)
                return {
                    index,
                    option: this.options[index],
                    score: result.score as number
                }
            })
    }

    /** Set option state by score

        For now just displays all scored elements (see threshold in fuse) and
        focus the best match.
    */
    setStateFromScore(scoredOpts: ScoredOption[]) {
        let matches = scoredOpts.map(res => res.index)

        for (const [index, option] of enumerate(this.options)) {
            if (matches.includes(index)) option.state = 'normal'
            else option.state = 'hidden'
        }

        if (matches.length) {
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
            this.optionContainer.appendChild(option.html)
        }

        /* console.log('updateDisplay', this.optionContainer, newContainer) */

        /* let result1 = this.optionContainer.remove() */
        /* let res2 = this.node.appendChild(newContainer) */
        /* console.log('results', result1, res2) */
    }
}

// }}}

// {{{ IMPLEMENTATIONS

class BufferCompletionOption extends CompletionOptionHTML implements CompletionOptionFuse {
    public fuseKeys = []

    constructor(public value: string, tab: browser.tabs.Tab, isAlternative = false) {
        super()
        // Two character buffer properties prefix
        let pre = ""
        if (tab.active) pre += "%"
        else if (isAlternative) pre += "#"
        if (tab.pinned) pre += "@"

        // Push prefix before padding so we don't match on whitespace
        this.fuseKeys.push(pre)

        // Push properties we want to fuzmatch on
        this.fuseKeys.push(String(tab.index + 1), tab.title, tab.url)

        // Create HTMLElement
        const favIconUrl = tab.favIconUrl ? tab.favIconUrl : DEFAULT_FAVICON
        this.html = html`<div class="BufferCompletionOption option">
            <span class="prefix">${pre.padEnd(2)}</span>
            <img src=${favIconUrl} />
            <span>${tab.index + 1}: ${tab.title}</span>
            <a class="url" target="_blank" href=${tab.url}>${tab.url}</a>
        </div>`
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
            [
                "buffer ",
                "tabclose ",
                "tabdetach ",
                "tabduplicate ",
                "tabmove ",
            ],
            "BufferCompletionSource", "Buffers"
        )

        this.updateOptions()
        this._parent.appendChild(this.node)
    }

    private async updateOptions(exstr?: string) {
        /* console.log('updateOptions', this.optionContainer) */
        const tabs: browser.tabs.Tab[] =
            await Messaging.message("commandline_background", "currentWindowTabs")

        const options = []

        // Get alternative tab, defined as last accessed tab.
        const alt = tabs.sort((a, b) => { return a.lastAccessed < b.lastAccessed ? 1 : -1 })[1]
        tabs.sort((a, b) => { return a.index < b.index ? -1 : 1 })

        for (const tab of tabs) {
            options.push(new BufferCompletionOption(
                (tab.index + 1).toString(),
                tab,
                tab === alt)
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
}

// {{{ UNUSED: MANAGING ASYNC CHANGES

/** If first to modify epoch, commit change. May want to change epoch after commiting. */
async function commitIfCurrent(epochref: any, asyncFunc: Function, commitFunc: Function, ...args: any[]): Promise<any> {
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
            source.obsolete,                   // Flag/epoch
            source.filter,                     // asyncFunc
            (childSource) => {                 // commitFunc
                source.obsolete = true
                sources[index] = childSource
                childSource.activate()
            },
            filter                              // argument to asyncFunc
        )
    }
}

// }}}

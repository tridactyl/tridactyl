/*

Have an array of all completion sources. Completion sources display nothing if the filter doesn't match for them.

On each input event, call updateCompletions on the array. That will mutate the array and update the display as required.

How to handle cached e.g. buffer information going out of date?

*/


import * as Fuse from 'fuse.js'
import {enumerate} from './itertools'

const DEFAULT_FAVICON = browser.extension.getURL("static/defaultFavicon.svg")

// {{{ INTERFACES

interface CompletionOption {
    // Highlight this option
    focus: () => void
    blur: () => void

    // What to fill into cmdline
    value: string
}

export abstract class CompletionSource {
    private obsolete = false

    readonly options = new Array<CompletionOption>()

    public node: HTMLElement

    // Called by updateCompletions on the child that succeeds its parent
    abstract activate(): void
        // this.node now belongs to you, update it or something :)
        // Example: Mutate node or call replaceChild on its parent

    abstract async filter(exstr): Promise<CompletionSource>
        // <Do some async work that doesn't mutate any non-local vars>
        // Make a new CompletionOptions and return it
}

// }}}

// {{{ IMPLEMENTATIONS

class BufferCompletionOption implements CompletionOption {
    // keep a reference to our markup so we can highlight it on focus().
    html: HTMLElement

    // For fuzzy matching
    matchStrings: string[]

    constructor(public value: string, tab: browser.tabs.Tab, isAlternative = false) {
        // Two character buffer properties prefix
        let pre = ""
        if (tab.active) pre += "%"
        else if (isAlternative) pre += "#"

        if (tab.pinned) {
            pre += "@"
            this.matchStrings.push('@')
        }

        pre = pre.padEnd(2)

        this.matchStrings = [tab.title, tab.url]

        const favIconUrl = tab.favIconUrl ? tab.favIconUrl : DEFAULT_FAVICON

        this.html = html`
        <div>
            <span>${pre}</span>
            <img src=${favIconUrl}></img>
            <span>${tab.index + 1}: ${tab.title}</span>
            <a class="url" href=${tab.url}>${tab.url}</a>
        </div>`
    }

    focus() {
        this.html.classList.add("focused")
    }

    blur() {
        this.html.classList.remove("focused")
    }
}

export class BufferCompletionSource extends CompletionSource {
    private fuse: Fuse
    public prefixes = [ "buffer " ]

    constructor(
        readonly options: BufferCompletionOption[],
        public node: HTMLElement,
        private selection?: BufferCompletionOption
    ) {
        super()
        const fuseOptions = {
            shouldSort: true,
            includeScore: true,
            keys: ["matchStrings"],
        }
        this.fuse = new Fuse(options, fuseOptions)
    }

    static fromTabs(tabs: browser.tabs.Tab[]) {
        const node = html`<div class="BufferCompletionSource">`

        // Get alternative tab, defined as last accessed tab.
        const alt = tabs.sort((a, b) => { return a.lastAccessed < b.lastAccessed ? 1 : -1 })[1]
        tabs.sort((a, b) => { return a.index < b.index ? -1 : 1 })

        const options: BufferCompletionOption[] = []

        for (const tab of tabs) {
            options.push(new BufferCompletionOption(
                (tab.index + 1).toString(),
                tab,
                tab === alt)
            )
        }

        for (const option of options) {
            node.appendChild(option.html)
        }

        return new BufferCompletionSource(options, node)
    }

    activate() {
        // TODO... this bit of the interface isn't super clear to me yet.
    }

    async filter(exstr: string) {
        // We populate completions with buffer on more than buffer
        // if (! exstr.startsWith('buffer ')) {
        //     // Disable
        // }

        // Remove the 'buffer ' bit.
        const query = exstr.slice(exstr.indexOf(' '))

        /** If query is a number, focus corresponding index.
            Else fuzzy search
        */
        let match: BufferCompletionOption = undefined
        if (! isNaN(Number(query)) && Number(query) <= this.options.length) {
            match = this.options[Number(query)]
        } else {
            // Fuzzy search!
            match = this.fuse.search('query')[0] as BufferCompletionOption
        }

        return new BufferCompletionSource(this.options, this.node, match)
    }
}

// }}}

// {{{ MANAGING ASYNC CHANGES

/* If first to modify completions, update it. */
async function commitIfCurrent(epochref: any, asyncFunc: Function, commitFunc: Function, ...args: any[]): Promise<any> {
    // I *think* sync stuff in here is guaranteed to happen immediately after
    // being called, up to the first await, despite this being an async
    // function. But I don't know. Should check.
    const epoch = epochref
    const res = await asyncFunc(...args)
    if (epoch === epochref) return commitFunc(res)
    else console.error(new Error("Update failed: epoch out of date!"))
}

/* Indicate changes to completions we would like. */
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

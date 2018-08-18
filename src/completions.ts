/*

Have an array of all completion sources. Completion sources display nothing if the filter doesn't match for them.

On each input event, call updateCompletions on the array. That will mutate the array and update the display as required.

How to handle cached e.g. buffer information going out of date?

Concrete completion classes have been moved to src/completions/.

*/

import * as Fuse from "fuse.js"
import { enumerate } from "./itertools"
import { toNumber } from "./convert"
import * as config from "./config"
import * as aliases from "./aliases"

export const DEFAULT_FAVICON = browser.extension.getURL(
    "static/defaultFavicon.svg",
)

// {{{ INTERFACES

type OptionState = "focused" | "hidden" | "normal"

export abstract class CompletionOption {
    /** What to fill into cmdline */
    value: string
    /** Control presentation of the option */
    state: OptionState
}

export abstract class CompletionSource {
    readonly options: CompletionOption[]
    node: HTMLElement
    public completion: string
    protected prefixes: string[] = []

    constructor(prefixes) {
        let commands = aliases.getCmdAliasMapping()

        // Now, for each prefix given as argument, add it to the completionsource's prefix list and also add any alias it has
        prefixes.map(p => p.trim()).forEach(p => {
            this.prefixes.push(p)
            if (commands[p]) this.prefixes = this.prefixes.concat(commands[p])
        })

        // Not sure this is necessary but every completion source has it
        this.prefixes = this.prefixes.map(p => p + " ")
    }

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

export abstract class CompletionOptionHTML extends CompletionOption {
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

export interface CompletionOptionFuse extends CompletionOptionHTML {
    // For fuzzy matching
    fuseKeys: any[]
}

export type ScoredOption = {
    index: number
    option: CompletionOptionFuse
    score: number
}

export abstract class CompletionSourceFuse extends CompletionSource {
    public node
    public options: CompletionOptionFuse[]
    protected lastExstr: string
    protected lastFocused: CompletionOption

    protected optionContainer = html`<table class="optionContainer">`

    constructor(prefixes, className: string, title?: string) {
        super(prefixes)
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
        await this.onInput(exstr)
        await this.updateChain()
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
        let searchThis = this.options.map((elem, index) => {
            return { index, fuseKeys: elem.fuseKeys }
        })
        this.fuse = new Fuse(searchThis, this.fuseOptions)
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

import {enumerate} from './itertools'
const DEFAULT_FAVICON = browser.extension.getURL("static/defaultFavicon.svg")

// HIGH LEVEL OBJECTS
interface CompletionOption {
    // Highlight this option
    focus: () => void
    // What to fill into cmdline
    value: string
}
export abstract class CompletionSource {
    private obsolete = false
    readonly options = new Array<CompletionOption>()
    public node: HTMLElement
    // Called by updateCompletions on the child that succeeds its parent
    abstract activate()
        // this.node now belongs to you, update it or something :)
        // Example: Mutate node or call replaceChild on its parent
    abstract async filter(exstr): Promise<CompletionSource>
        // <Do some async work that doesn't mutate any non-local vars>
        // Make a new CompletionOptions and return it
}

// CONTEXT SPECIFIC
class BufferCompletionOption implements CompletionOption {
    constructor(public favIconUrl: string, public index: number, public title: string, public pre: string, public url: string, public value: string) {}
    html: HTMLElement // keep a reference to our markup so we can change it
    render(highlight: boolean = false): void {
        const html = document.createElement("div")
        if (highlight) html.setAttribute("class", "highlighted")
        html.innerHTML = `<span></span><span></span><span></span><span></span><a href="${this.url}" class="url" target="_blank"><span></span></a>`
        html.childNodes[0].textContent = ` ${this.pre.padEnd(2)} `
        html.childNodes[1].nodeValue = `<img src="${this.favIconUrl}"> `
        if (this.index) html.childNodes[2].textContent = `${this.index}: `
        html.childNodes[3].textContent = `${this.title} `
        html.childNodes[4].textContent = `${this.url} `
        this.html = html
    }
    focus(): void { this.render(true) }
}
class BufferCompletionSource extends CompletionSource {
    constructor(readonly options: BufferCompletionOption[], public node: HTMLElement) { super() }
    activate(): HTMLElement { return this.node }
    async filter(exstr: string): Promise<BufferCompletionSource> {
        const match = function(queries: string[], option): boolean {
            return queries.every((query) => {
                return (/[A-Z]/.test(query)
                    ? option.title.includes(query) || option.url.includes(query)
                    : option.title.toLowerCase().includes(query) || option.url.toLowerCase().includes(query)
        )})}.bind(null, exstr.split(/\s+/))
        const filtered: HTMLElement = window.document.createElement("div")
        filtered.setAttribute("id", "completions")
        for (const option of this.options) {
            if (match(option)) { option.render(); filtered.appendChild(option.html) }
        }
        return new BufferCompletionSource(this.options, filtered)
    }
}

// MANAGING ASYNC CHANGES
/* If first to modify completions, update it. */
async function commitIfCurrent(epochref: any, asyncFunc: Function, commitFunc: Function, ...args: any[]): Promise<any> {
    // I *think* sync stuff in here is guaranteed to happen immediately after
    // being called, up to the first await, despite this being an async
    // function. But I don't know. Should check.
    const epoch = epochref
    const res = await asyncFunc(...args)
    if (epoch === epochref) return commitFunc(res)
    else throw "Update failed: epoch out of date!"
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

// BUFFER SPECIFIC HELPERS
/** Create completion item from given tab. */
function optionFromTab(tab: browser.tabs.Tab, prev: boolean = false): BufferCompletionOption {
    let pre: string = ""
    if (tab.active) pre += "%"
    else if (prev) pre += "#"
    if (tab.pinned) pre += "@"
    return new BufferCompletionOption(
        tab.favIconUrl ? tab.favIconUrl : DEFAULT_FAVICON,
        tab.index + 1,
        tab.title,
        pre,
        tab.url,
        `${tab.index + 1}: ${tab.title}`
    )
}
export function getBuffersFromTabs(tabs: browser.tabs.Tab[]): BufferCompletionSource {
    const buffers: BufferCompletionOption[] = []
    const markup: HTMLElement = window.document.createElement("div")
    const prev = tabs.sort((a, b) => { return a.lastAccessed < b.lastAccessed ? 1 : -1 })[1]
    tabs.sort((a, b) => { return a.index < b.index ? -1 : 1 })
    for (const tab of tabs) { buffers.push(optionFromTab(tab, tab === prev)) }
    markup.setAttribute("id", "completions")
    for (const buffer of buffers) { buffer.render(); markup.appendChild(buffer.html) }
    return new BufferCompletionSource(buffers, markup)
}

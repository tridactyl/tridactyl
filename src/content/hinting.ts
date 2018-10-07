/** Hint links.

    TODO:

    important
        Connect to input system
        Gluing into tridactyl
    unimportant
        Frames
        Redraw on reflow
*/

import * as DOM from "@src/lib/dom"
import { log } from "@src/lib/math"
import {
    permutationsWithReplacement,
    islice,
    izip,
    map,
    unique,
} from "@src/lib/itertools"
import { contentState } from "@src/content/state_content"
import * as config from "@src/lib/config"
import Logger from "@src/lib/logging"
const logger = new Logger("hinting")

// A BooleanFilter is meant to represent a selection of active
// elements of an array, while maintaining which elements have
// been deactivated already.
//
// Invariant: pos.length + neg.length = xs.length
// Invariant: set(pos) union set(neg) = set(xs)
// Invariant: set(pos) intersect set(neg) = empty
class BooleanFilter<T> {
    // Both pos and neg index into xs.
    private pos: number[]
    private neg: number[]

    private readonly xs: T[]

    public static forData<T>(xs: T[]) {
        return new BooleanFilter(xs, xs.map((x, i) => i), [])
    }

    constructor(xs: T[], pos, neg) {
        // Initially, all items are active and none are inactive.
        this.pos = pos
        this.neg = neg
        this.xs = xs
    }

    // Returns a new, more narrow BooleanFilter, or undefined if
    // the given predicate does not deactivate any active elements.
    narrow(predicate: (x: T) => boolean) {
        // If there are no elements left, the given predicate cannot deactivate any.
        if (this.pos.length === 0) {
            return undefined
        }

        const neg = []
        for (const i in this.neg) {
            neg.push(i)
        }

        const pos = []
        for (const i in this.pos) {
            (predicate(this.xs[i]) ? pos : neg).push(i)
        }

        // Check whether the predicate used actually narrowed the filter.
        if (this.pos.length === pos.length) {
            return undefined
        }

        return new BooleanFilter<T>(this.xs, pos, neg)
    }

    project(active: boolean = true) {
        return (active ? this.pos : this.neg).map(i => this.xs[i])
    }

    get size() {
        return this.pos.length
    }
}

/** Simple container for the state of a single frame's hints.
 * Hints generally follow the following flow:
 * hintable, selected, focused
*/
class HintState {
    readonly hintHost = document.createElement("div")
    readonly hints: Hint[] = []

    private filter: BooleanFilter<Hint>

    public fstr = ""
    public hintchars = ""

    private _focusedHint: number
    
    get focusedHint(): number {
        return this._focusedHint
    }

    set focusedHint(i: number) {
        this.hints[this._focusedHint].focused = false
        this._focusedHint = i
        this.hints[this._focusedHint].focused = true
    }

    constructor(
        public filterFunc: FilteringFunction,
        public resolve: (Hint) => void,
        public reject: (any) => void,
        public rapid: boolean,
    ) {
        this.hintHost.classList.add("TridactylHintHost", "cleanslate")
    }

    /**
     * Remove hinting elements and classes from the DOM
     */
    cleanUpHints() {
        // Undo any alterations of the hinted elements
        for (const hint of this.hints) {
            hint.hidden = true
        }

        // Remove all hints from the DOM.
        this.hintHost.remove()
    }

    resolveHinting() {
        this.cleanUpHints()

        if (this.rapid) {
            this.resolve(this.selectedHints.map(h => h.result))
        }
        else {
            this.resolve(
                this.selectedHints[0] ? this.selectedHints[0].result : "",
            )
        }
    }

    // Applies the filtering function with the current filter to the argument.
    // If there is only one active hint left, it is selected.
    update() {
        // TODO: Call filtering functions
        const narrowed = this.filterFunc(this.filter, this.fstr)

        if (narrowed === undefined) {

        }

        // TODO: What about stability of selection? If we narrow the filter,
        // the same element should stay selected from a user's perspective.

        // Hide inactive hints.
        for (const h of this.filter.project(false)) {
            h.hidden = true
        }

        // Show and update labels of active
        for (const h of this.filter.project()) {
            h.hidden = false
            h.flag.textContent = h.name
        }

        // Focus first hint
        if (this.filter.size > 0) {
            modeState.focusedHint = this.filter.project()[0]
        }

        // Select focused hint if it's the only match
        if (this.filter.size === 1) {
            this.selectFocusedHint(true)
        }
    }

    narrow(key: string) {
        this.fstr += key
        this.update()
    }

    revert() {
        this.fstr = this.fstr.substring(0, this.fstr.length - 1)
        this.update()
    }

    selectFocusedHint(delay = false) {
        logger.debug("Selecting hint.", contentState.mode)
        if (delay) {
            setTimeout(this.selectFocusedHintInternal, config.get("hintdelay"))
        }
        else {
            this.selectFocusedHintInternal()
        }
    }

    focusNextActive() {
        
    }

    private selectFocusedHintInternal() {
        this.filter = '' 
        this.hints.forEach(h => (h.hidden = false))
        this.hints[this.focusedHint].select()
    }
}

let modeState: HintState = undefined

/** For each hintable element, add a hint */
export function hintPage(
    hintableElements: Element[],
    onSelect: HintSelectedCallback,
    resolve = () => {},
    reject = () => {},
    rapid = false,
) {
    const [builder, filter]: [HintBuilder, FilteringFunction] = defaultHinting()

    const onSelectInternal = rapid ? hint => {
            modeState.cleanUpHints()
            hint.result = onSelect(hint.target)
            modeState.selectedHints.push(hint)
            reset()
    } : hint => {
            hint.result = onSelect(hint.target)
            modeState.selectedHints.push(hint)
    }

    const hints = builder(hintableElements, onSelectInternal)

    if (hints.length === 0) {
        logger.warning('No hints, therefore not entering hint mode!')
        reset()
        return
    }

    const firstTarget = hints[0].target
    const shouldSelect =
        firstTarget instanceof HTMLAnchorElement &&
        firstTarget.href !== "" &&
        !firstTarget.href.startsWith("javascript:")
    if (shouldSelect) {
        // Try to find an element that is not a link or that doesn't point
        // to the same URL as the first hint.
        const different = hints.some(h =>
            !(h.target instanceof HTMLAnchorElement) ||
            h.target.href !== (<HTMLAnchorElement>firstTarget).href
        )

        if (!different) {
            logger.warning('Only one hyperlink found. Following without entering hint mode!')
            hints[0].select()
            reset()
            return
        }
    }

    contentState.mode = "hint"
    modeState = new HintState(filter, resolve, reject, rapid)

    logger.debug("hints", modeState.hints)
    document.documentElement.appendChild(modeState.hintHost)
}

function filterHintsVimperatorCurry(reflow: boolean) {
    return (filter, fstr) => filterHintsVimperator(filter, fstr, reflow)
}

function defaultHinting(): [HintBuilder, FilteringFunction] {
    switch (config.get("hintfiltermode")) {
        case "simple":
            return [buildHintsSimple, filterHintsSimple]
        case "vimperator":
            return [buildHintsVimperator, filterHintsVimperatorCurry(false)]
        case "vimperator-reflow":
            return [buildHintsVimperator, filterHintsVimperatorCurry(true)]
    }
}

function defaultHintChars() {
    switch (config.get("hintnames")) {
        case "numeric":
            return "1234567890"
        default:
            return config.get("hintchars")
    }
}

/** An infinite stream of hints

    Earlier hints prefix later hints
*/
function* hintnames_simple(hintchars): IterableIterator<string> {
    for (let taglen = 1; true; taglen++) {
        yield* map(permutationsWithReplacement(hintchars, taglen), e =>
            e.join("")
        )
    }
}

/** Shorter hints

    Hints that are prefixes of other hints are a bit annoying because you have to select them with Enter or Space.

    This function removes hints that prefix other hints by observing that:
        let h = hintchars.length
        if n < h ** 2
        then n / h = number of single character hintnames that would prefix later hints

    So it removes them. This function is not yet clever enough to realise that if n > h ** 2 it should remove
        h + (n - h**2 - h) / h ** 2
    and so on, but we hardly ever see that many hints, so whatever.
    
*/
function* hintnames_short(n: number, hintchars): IterableIterator<string> {
    const source = hintnames_simple(hintchars)
    const num2skip = Math.floor(n / hintchars.length)
    yield* islice(source, num2skip, n + num2skip)
}

/** Uniform length hintnames */
function* hintnames_uniform(n: number, hintchars): IterableIterator<string> {
    if (n <= hintchars.length) {
        yield* islice(hintchars[Symbol.iterator](), n)
    } else {
        // else calculate required length of each tag
        const taglen = Math.ceil(log(n, hintchars.length))
        // And return first n permutations
        yield* map(
            islice(permutationsWithReplacement(hintchars, taglen), n),
            perm => {
                return perm.join("")
            },
        )
    }
}

function* hintnames_numeric(n: number): IterableIterator<string> {
    for (let i = 1; i <= n; i++) {
        yield String(i)
    }
}

function* hintnames(
    n: number,
    hintchars = defaultHintChars(),
): IterableIterator<string> {
    switch (config.get("hintnames")) {
        case "numeric":
            yield* hintnames_numeric(n)
        case "uniform":
            yield* hintnames_uniform(n, hintchars)
        default:
            yield* hintnames_short(n, hintchars)
    }
}

type HintSelectedCallback = (Hint) => any

/** Place a flag by each hintworthy element */
class Hint {
    public readonly flag = document.createElement("span")
    public result: any = null

    constructor(
        public readonly target: Element,
        public readonly name: string,
        public readonly filterData: any,
        private readonly onSelect: HintSelectedCallback,
    ) {
        // We need to compute the offset for elements that are in an iframe
        let offsetTop = 0
        let offsetLeft = 0
        if (target.ownerDocument !== document) {
            let iframe = DOM.getAllDocumentFrames().find(
                frame => frame.contentDocument == target.ownerDocument,
            )
            let rect = iframe.getClientRects()[0]
            offsetTop += rect.top
            offsetLeft += rect.left
        }

        const rect = target.getClientRects()[0]
        this.flag.textContent = name
        this.flag.className = "TridactylHint"
        if (config.get("hintuppercase") == "true") {
            this.flag.classList.add("TridactylHintUppercase")
        }
        /* this.flag.style.cssText = ` */
        /*     top: ${rect.top}px; */
        /*     left: ${rect.left}px; */
        /* ` */
        this.flag.style.cssText = `
            top: ${window.scrollY + offsetTop + rect.top}px !important;
            left: ${window.scrollX + offsetLeft + rect.left}px !important;
        `
        modeState.hintHost.appendChild(this.flag)
        this.hidden = false
    }

    // These styles would be better with pseudo selectors. Can we do custom ones?
    // If not, do a state machine.
    set hidden(hide: boolean) {
        this.flag.hidden = hide
        if (hide) {
            this.focused = false
            this.target.classList.remove("TridactylHintElem")
        } else {
            this.target.classList.add("TridactylHintElem")
        }
    }

    set focused(focus: boolean) {
        if (focus) {
            this.target.classList.add("TridactylHintActive")
            this.target.classList.remove("TridactylHintElem")
        } else {
            this.target.classList.add("TridactylHintElem")
            this.target.classList.remove("TridactylHintActive")
        }
    }

    select() {
        this.onSelect(this)
    }
}

type HintBuilder = (els: Element[], onSelect: HintSelectedCallback) => Hint[]

function buildHintsSimple(els: Element[], onSelect: HintSelectedCallback): Hint[] {
    const result = []
    for (let [el, name] of izip(els, hintnames(els.length))) {
        logger.debug({ el, name })
        result.push(new Hint(el, name, null, onSelect))
    }
    return result
}

function buildHintsVimperator(els: Element[], onSelect: HintSelectedCallback): Hint[] {
    const result = []
    // escape the hintchars string so that strange things don't happen
    // when special characters are used as hintchars (for example, ']')
    const escapedHintChars = defaultHintChars().replace(/^\^|[-\\\]]/g, "\\$&")
    const filterableTextFilter = new RegExp("[" + escapedHintChars + "]", "g")
    for (let [el, name] of izip(els, hintnames(els.length))) {
        let ft = elementFilterableText(el)
        // strip out hintchars
        ft = ft.replace(filterableTextFilter, "")
        logger.debug({ el, name, ft })
        result.push(new Hint(el, name, ft, onSelect))
    }
    return result
}

function elementFilterableText(el: Element): string {
    const nodename = el.nodeName.toLowerCase()
    let text: string
    if (nodename == "input") {
        text = (<HTMLInputElement>el).value
    } else if (0 < el.textContent.length) {
        text = el.textContent
    } else if (el.hasAttribute("title")) {
        text = el.getAttribute("title")
    } else {
        text = el.innerHTML
    }
    // Truncate very long text values
    return text.slice(0, 2048).toLowerCase() || ""
}

type FilteringFunction = (filter: BooleanFilter<Hint>, fstr: string) => BooleanFilter<Hint>

function filterHintsSimple(filter: BooleanFilter<Hint>, fstr) {
    return filter.narrow(h => h.name.startsWith(fstr))
}

/** Partition the filter string into hintchars and content filter strings.
    Apply each part in sequence, reducing the list of active hints.

    Update display after all filtering, adjusting labels if appropriate.

    Consider: This is a poster child for separating data and display. If they
    weren't so tied here we could do a neat dynamic programming thing and just
    throw the data at a reactalike.
*/
function filterHintsVimperator(filter: BooleanFilter<Hint>, fstr, reflow = false): BooleanFilter<Hint> {
    /** Partition a fstr into a tagged array of substrings */
    function partitionFstr(fstr): { str: string; isHintChar: boolean }[] {
        const peek = a => a[a.length - 1]
        const hintChars = defaultHintChars()

        // For each char, either add it to the existing run if there is one and
        // it's a matching type or start a new run
        const runs = []
        for (const char of fstr) {
            const isHintChar = hintChars.includes(char)
            if (!peek(runs) || peek(runs).isHintChar !== isHintChar) {
                runs.push({ str: char, isHintChar })
            } else {
                peek(runs).str += char
            }
        }
        return runs
    }

    function rename(hints) {
        const names = hintnames(hints.length)
        for (const [hint, name] of izip(hints, names)) {
            hint.name = name
        }
    }

    // If we're reflowing, the names may be wrong at this point, so apply the original names.
    if (reflow) {
        rename(filter.project())
    }

    for (const run of partitionFstr(fstr)) {
        if (run.isHintChar) {
            // Filter by name
            filter = filter.narrow(h => h.name.startsWith(run.str))
            continue
        }

        const before = filter.size

        // Filter by text
        filter = filter.narrow(h => h.filterData.includes(run.str))

        if (reflow && filter.size !== before) {
            rename(filter.project())
        }
    }
    return filter
}

/** Remove all hints, reset STATE.
 **/
function reset() {
    if (modeState) {
        modeState.cleanUpHints()
        modeState.resolveHinting()
    }
    modeState = undefined
    contentState.mode = "normal"
}

/** Array of hintable elements in viewport

    Elements are hintable if
        1. they can be meaningfully selected, clicked, etc
        2. they're visible
            1. Within viewport
            2. Not hidden by another element
*/
export function hintables(selectors = DOM.HINTTAGS_selectors, withjs = false) {
    let elems = DOM.getElemsBySelector(selectors, [])
    if (withjs) {
        elems = elems.concat(DOM.hintworthy_js_elems)
        elems = unique(elems)
    }
    return elems.filter(DOM.isVisible)
}

/** Returns elements that point to a saveable resource
 */
export function saveableElements() {
    return DOM.getElemsBySelector(DOM.HINTTAGS_saveable, [DOM.isVisible])
}

/** Get array of images in the viewport
 */
export function hintableImages() {
    return DOM.getElemsBySelector(DOM.HINTTAGS_img_selectors, [DOM.isVisible])
}

/** Array of items that can be killed with hint kill
 */
export function killables() {
    return DOM.getElemsBySelector(DOM.HINTTAGS_killable_selectors, [
        DOM.isVisible,
    ])
}

export function pipe(
    selectors = DOM.HINTTAGS_selectors,
    action: HintSelectedCallback = _ => _,
    rapid = false,
): Promise<[Element, number]> {
    return new Promise((resolve, reject) =>
        hintPage(hintables(selectors, true), action, resolve, reject, rapid)
    )
}

export function pipe_elements(
    elements: any = DOM.elementsWithText,
    action: HintSelectedCallback = _ => _,
    rapid = false,
): Promise<[Element, number]> {
    return new Promise((resolve, reject) =>
        hintPage(elements, action, resolve, reject, rapid)
    )
}

export function parser(keys: KeyboardEvent[]) {
    for (const { key } of keys) {
        if (key === "Escape") {
            reset()
        } else if (["Enter", " "].includes(key)) {
            modeState.selectFocusedHint()
        } else if (key === "Tab") {
            modeState.focusNextActive()
        } else if ("Control" === key || "Alt" === key || "Meta" === key) {
            return
        } else if (key === "Backspace") {
            modeState.revert()
        } else if (key.length > 1) {
            return
        } else {
            modeState.narrow(key)
        }
    }
    return { keys: [], ex_str: "", isMatch: true }
}

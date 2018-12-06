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
import { hasModifiers } from "@src/lib/keyseq"
import { contentState } from "@src/content/state_content"
import { messageActiveTab, message } from "@src/lib/messaging"
import * as config from "@src/lib/config"
import * as TTS from "@src/lib/text_to_speech"
import Logger from "@src/lib/logging"
import * as Messaging from "@src/lib/messaging"
const logger = new Logger("hinting")

/** Simple container for the state of a single frame's hints. */
class HintState {
    public focusedHint: Hint
    readonly hintHost = document.createElement("div")
    readonly hints: Hint[] = []
    public visible = false
    public selectedHints: Hint[] = []
    public filter = ""
    public hintchars = ""

    constructor(
        public filterFunc: HintFilter,
        public resolve: (Hint) => void,
        public reject: (any) => void,
        public rapid: boolean,
    ) {
        this.hintHost.classList.add("TridactylHintHost", "cleanslate")
    }

    deOverlap() {
        let moved = false
        let repulsionForce = 6
        let attraction = 0.05
        let velocityLoss = 1.4
        // Compute new hint positions
        this.hints.map(hint => {
            let overlapping = this.hints.filter(
                curHint => hint != curHint && hint.overlapsWith(curHint),
            )
            let vector = overlapping
                // Compute repulsion between hints
                .reduce(
                    (repulsion, curHint) => {
                        // compute distance between hint and curHint
                        let distX = hint.x - curHint.x
                        let distY = hint.y - curHint.y
                        let dist = distX * distX + distY * distY
                        // Some hints might be perfectly overlaping (dist = 0), but we
                        // need a distance of at least 1 to compute repulsion
                        if (dist == 0) dist = 1
                        repulsion.x += (distX / dist) * repulsionForce
                        repulsion.y += (distY / dist) * repulsionForce
                        return repulsion
                    },
                    { x: 0, y: 0, hint },
                )
            // Compute attraction between hint and its origin
            // Multiply by overlapping.length in order to counteract repulsion caused by other flags
            vector.x += (hint.originX - hint.x) * attraction
            vector.y += (hint.originY - hint.y) * attraction
            hint.velocityX = (hint.velocityX + vector.x) / velocityLoss
            hint.velocityY = (hint.velocityY + vector.y) / velocityLoss
            if (hint.velocityX > 1 || hint.velocityX < -1) {
                let newX = hint.x + hint.velocityX
                if (hint.x < 0) newX = 0
                if (
                    hint.x + hint.width >
                    hint.flag.ownerDocument.body.clientWidth
                )
                    newX = hint.flag.ownerDocument.body.clientWidth - hint.width
                hint.x = newX
                moved = true
            }
            if (hint.velocityY > 1 || hint.velocityY < -1) {
                let newY = hint.y + hint.velocityY
                if (hint.y < 0) newY = 0
                if (
                    hint.y + hint.height >
                    hint.flag.ownerDocument.body.clientHeight
                )
                    newY =
                        hint.flag.ownerDocument.body.clientHeight - hint.height
                moved = true
            }
        })
        if (this.visible && moved)
            window.requestAnimationFrame(this.deOverlap.bind(this))
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

        this.visible = false
    }

    resolveHinting() {
        this.cleanUpHints()

        if (this.rapid) this.resolve(this.selectedHints.map(h => h.result))
        else
            this.resolve(
                this.selectedHints[0] ? this.selectedHints[0].result : "",
            )
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
    let buildHints: HintBuilder = defaultHintBuilder()
    let filterHints: HintFilter = defaultHintFilter()
    contentState.mode = "hint"
    modeState = new HintState(filterHints, resolve, reject, rapid)

    if (rapid == false) {
        buildHints(hintableElements, hint => {
            modeState.cleanUpHints()
            hint.result = onSelect(hint.target)
            modeState.selectedHints.push(hint)
            reset()
        })
    } else {
        buildHints(hintableElements, hint => {
            hint.result = onSelect(hint.target)
            modeState.selectedHints.push(hint)
        })
    }

    if (modeState.hints.length) {
        let firstTarget = modeState.hints[0].target
        let shouldSelect =
            firstTarget instanceof HTMLAnchorElement &&
            firstTarget.href !== "" &&
            !firstTarget.href.startsWith("javascript:")
        if (shouldSelect) {
            // Try to find an element that is not a link or that doesn't point
            // to the same URL as the first hint
            let different = modeState.hints.find(h => {
                return (
                    !(h.target instanceof HTMLAnchorElement) ||
                    h.target.href !== (<HTMLAnchorElement>firstTarget).href
                )
            })

            if (different === undefined) {
                modeState.cleanUpHints()
                modeState.hints[0].select()
                reset()
                return
            }
        }

        logger.debug("hints", modeState.hints)
        modeState.focusedHint = modeState.hints[0]
        modeState.focusedHint.focused = true
        modeState.visible = true
        document.documentElement.appendChild(modeState.hintHost)
        modeState.deOverlap()
    } else {
        reset()
    }
}

function defaultHintBuilder() {
    switch (config.get("hintfiltermode")) {
        case "simple":
            return buildHintsSimple
        case "vimperator":
            return buildHintsVimperator
        case "vimperator-reflow":
            return buildHintsVimperator
    }
}

function defaultHintFilter() {
    switch (config.get("hintfiltermode")) {
        case "simple":
            return filterHintsSimple
        case "vimperator":
            return filterHintsVimperator
        case "vimperator-reflow":
            return fstr => filterHintsVimperator(fstr, true)
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
function* hintnames_simple(
    hintchars = defaultHintChars(),
): IterableIterator<string> {
    for (let taglen = 1; true; taglen++) {
        yield* map(permutationsWithReplacement(hintchars, taglen), e =>
            e.join(""),
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
function* hintnames_short(
    n: number,
    hintchars = defaultHintChars(),
): IterableIterator<string> {
    let source = hintnames_simple(hintchars)
    const num2skip = Math.floor(n / hintchars.length)
    yield* islice(source, num2skip, n + num2skip)
}

/** Uniform length hintnames */
function* hintnames_uniform(
    n: number,
    hintchars = defaultHintChars(),
): IterableIterator<string> {
    if (n <= hintchars.length) yield* islice(hintchars[Symbol.iterator](), n)
    else {
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
    private _x: number = 0
    private _y: number = 0
    public width: number = 0
    public height: number = 0
    public originX: number = 0
    public originY: number = 0
    public velocityX: number = 0
    public velocityY: number = 0

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
        this.y = this.originY = window.scrollY + offsetTop + rect.top
        this.x = this.originX = window.scrollX + offsetLeft + rect.left
        modeState.hintHost.appendChild(this.flag)
        this.hidden = false
    }

    set x(X: number) {
        this._x = X
        this.updatePosition()
    }

    get x() {
        return this._x
    }

    set y(Y: number) {
        this._y = Y
        this.updatePosition()
    }

    get y() {
        return this._y
    }

    private updatePosition() {
        this.flag.style.cssText = `
            top: ${this._y}px !important;
            left: ${this._x}px !important;
        `
    }

    public overlapsWith(h: Hint) {
        if (this.width == 0) this.width = this.flag.getClientRects()[0].width
        if (this.height == 0) this.height = this.flag.getClientRects()[0].height
        return (
            this.x <= h.x + h.width &&
            this.x + this.width >= h.x &&
            this.y <= h.y + h.height &&
            this.y + this.height >= h.y
        )
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

type HintBuilder = (els: Element[], onSelect: HintSelectedCallback) => void

function buildHintsSimple(els: Element[], onSelect: HintSelectedCallback) {
    let names = hintnames(els.length)
    for (let [el, name] of izip(els, names)) {
        logger.debug({ el, name })
        modeState.hintchars += name
        modeState.hints.push(new Hint(el, name, null, onSelect))
    }
}

function buildHintsVimperator(els: Element[], onSelect: HintSelectedCallback) {
    let names = hintnames(els.length)
    // escape the hintchars string so that strange things don't happen
    // when special characters are used as hintchars (for example, ']')
    const escapedHintChars = defaultHintChars().replace(/^\^|[-\\\]]/g, "\\$&")
    const filterableTextFilter = new RegExp("[" + escapedHintChars + "]", "g")
    for (let [el, name] of izip(els, names)) {
        let ft = elementFilterableText(el)
        // strip out hintchars
        ft = ft.replace(filterableTextFilter, "")
        logger.debug({ el, name, ft })
        modeState.hintchars += name + ft
        modeState.hints.push(new Hint(el, name, ft, onSelect))
    }
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

type HintFilter = (string) => void

/** Show only hints prefixed by fstr. Focus first match */
function filterHintsSimple(fstr) {
    const active: Hint[] = []
    let foundMatch
    for (let h of modeState.hints) {
        if (!h.name.startsWith(fstr)) h.hidden = true
        else {
            if (!foundMatch) {
                h.focused = true
                modeState.focusedHint = h
                foundMatch = true
            }
            h.hidden = false
            active.push(h)
        }
    }
    if (active.length == 1) {
        selectFocusedHint()
    }
}

/** Partition the filter string into hintchars and content filter strings.
    Apply each part in sequence, reducing the list of active hints.

    Update display after all filtering, adjusting labels if appropriate.

    Consider: This is a poster child for separating data and display. If they
    weren't so tied here we could do a neat dynamic programming thing and just
    throw the data at a reactalike.
*/
function filterHintsVimperator(fstr, reflow = false) {
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

    // Start with all hints
    let active = modeState.hints

    // If we're reflowing, the names may be wrong at this point, so apply the original names.
    if (reflow) rename(active)

    // Filter down (renaming as required)
    for (const run of partitionFstr(fstr)) {
        if (run.isHintChar) {
            // Filter by label
            active = active.filter(hint => hint.name.startsWith(run.str))
        } else {
            // By text
            active = active.filter(hint => hint.filterData.includes(run.str))
        }

        if (reflow && !run.isHintChar) {
            rename(active)
        }
    }

    // Update display
    // Hide all hints
    for (const hint of modeState.hints) {
        // Warning: this could cause flickering.
        hint.hidden = true
    }
    // Show and update labels of active
    for (const hint of active) {
        hint.hidden = false
        hint.flag.textContent = hint.name
    }
    // Focus first hint
    if (active.length) {
        if (modeState.focusedHint) {
            modeState.focusedHint.focused = false
        }
        active[0].focused = true
        modeState.focusedHint = active[0]
    }

    // Select focused hint if it's the only match
    if (active.length == 1) {
        selectFocusedHint(true)
    }
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

/** If key is in hintchars, add it to filtstr and filter */
function pushKey(ke) {
    if (ke.ctrlKey || ke.altKey || ke.metaKey) {
        return
    } else if (ke.key === "Backspace") {
        modeState.filter = modeState.filter.slice(0, -1)
        modeState.filterFunc(modeState.filter)
    } else if (ke.key.length > 1) {
        return
    } else if (modeState.hintchars.includes(ke.key)) {
        modeState.filter += ke.key
        modeState.filterFunc(modeState.filter)
    }
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

import { openInNewTab, activeTabContainerId } from "@src/lib/webext"
import { openInNewWindow } from "@src/lib/webext"

export function pipe(
    selectors = DOM.HINTTAGS_selectors,
    action: HintSelectedCallback = _ => _,
    rapid = false,
): Promise<[Element, number]> {
    return new Promise((resolve, reject) => {
        hintPage(hintables(selectors, true), action, resolve, reject, rapid)
    })
}

export function pipe_elements(
    elements: any = DOM.elementsWithText,
    action: HintSelectedCallback = _ => _,
    rapid = false,
): Promise<[Element, number]> {
    return new Promise((resolve, reject) => {
        hintPage(elements, action, resolve, reject, rapid)
    })
}

function selectFocusedHint(delay = false) {
    logger.debug("Selecting hint.", contentState.mode)
    const focused = modeState.focusedHint
    let selectFocusedHintInternal = () => {
        modeState.filter = ""
        modeState.hints.forEach(h => (h.hidden = false))
        focused.select()
    }
    if (delay) setTimeout(selectFocusedHintInternal, config.get("hintdelay"))
    else selectFocusedHintInternal()
}

export function parser(keys: KeyboardEvent[]) {
    for (const { key } of keys) {
        if (key === "Escape") {
            reset()
        } else if (["Enter", " "].includes(key)) {
            selectFocusedHint()
        } else {
            pushKey(keys[0])
        }
    }
    return { keys: [], ex_str: "", isMatch: true }
}

import * as config from "@src/lib/config"
import * as DOM from "@src/lib/dom"
import { browserBg, activeTabId } from "@src/lib/webext"
import state from "@src/state"
import * as State from "@src/state"
import { compute as scrollCompute } from "compute-scroll-into-view"

// The host is the shadow root of a span used to contain all highlighting
// elements. This is the least disruptive way of highlighting text in a page.
// It needs to be placed at the very top of the page.
let host
function getFindHost() {
    if (host) {
        return host
    }
    const elem = document.createElement("span")
    elem.id = "TridactylFindHost"
    elem.className = "cleanslate"
    elem.style.setProperty("position", "absolute", "important")
    elem.style.setProperty("top", "0px", "important")
    elem.style.setProperty("left", "0px", "important")
    document.documentElement.appendChild(elem)
    host = elem.attachShadow({ mode: "closed" })
    return host
}

const NATIVE_HIGHLIGHTS = typeof Highlight === "function" && "highlights" in CSS

class FindHighlight extends HTMLSpanElement {
    public top = Infinity
    public nativeRange: Range
    private background = `rgba(127,255,255,0.5)`

    constructor(public range: Range) {
        super()
        this.nativeRange = NATIVE_HIGHLIGHTS ? range.cloneRange() : range
        {
            // https://bugzilla.mozilla.org/show_bug.cgi?id=1716685
            const proto = FindHighlight.prototype
            for (const key of Object.getOwnPropertyNames(proto)) {
                this[key] = proto[key]
            }
        }
        this.style.position = "absolute"
        this.style.top = "0px"
        this.style.left = "0px"
        this.updateRectsPosition()
        ;(this as any).unfocus()
    }

    static fromFindApi(found, allTextNode: Text[]) {
        const range = document.createRange()
        range.setStart(allTextNode[found.startTextNodePos], found.startOffset)
        range.setEnd(allTextNode[found.endTextNodePos], found.endOffset)
        if (range.getClientRects().length < 1)
            throw new Error("Range has no rects")
        return new this(range)
    }

    updateRectsPosition() {
        if (NATIVE_HIGHLIGHTS) {
            this.top = this.getBoundingClientRect().top + window.pageYOffset
            return
        }
        const rects = this.getClientRects()
        this.top = Infinity
        const windowTop = window.pageYOffset
        const windowLeft = window.pageXOffset
        for (let i = 0; i < rects.length; i++) {
            const rect = rects[i]
            if (rect.top + windowTop < this.top) {
                this.top = rect.top + windowTop
            }
            let highlight
            if (i in this.children) highlight = this.children[i]
            else {
                highlight = document.createElement("span")
                this.appendChild(highlight)
            }
            highlight.className = "TridactylFindHighlight"
            highlight.style.position = "absolute"
            highlight.style.top = `${rect.top + windowTop}px`
            highlight.style.left = `${rect.left + windowLeft}px`
            highlight.style.width = `${rect.right - rect.left}px`
            highlight.style.height = `${rect.bottom - rect.top}px`
            highlight.style.zIndex = "2147483645"
            highlight.style.pointerEvents = "none"
            highlight.style.background = this.background
        }
        while (this.children.length > rects.length)
            this.lastElementChild?.remove()
    }

    getBoundingClientRect() {
        return this.range.getBoundingClientRect()
    }
    getClientRects() {
        return this.range.getClientRects()
    }
    unfocus() {
        setNativeFocus(this.nativeRange, false)
        this.background = `rgba(127,255,255,0.5)`
        for (const node of this.children) {
            ;(node as HTMLElement).style.background = this.background
        }
    }
    scrollIntoView(...options) {
        let option
        if (options.length === 0 || options[0] === true) {
            option = { block: "start", inline: "nearest" }
        } else if (options[0] === false) {
            option = { block: "end", inline: "nearest" }
        } else option = options[0]

        const fakeNode = {
            nodeType: Node.ELEMENT_NODE,
            getBoundingClientRect: () => this.getBoundingClientRect(),
            parentElement: null,
        }
        let parent = this.range.commonAncestorContainer
        if (parent.nodeType !== Node.ELEMENT_NODE) {
            parent = parent.parentElement
        }
        fakeNode.parentElement = parent

        const actions = scrollCompute(fakeNode as HTMLElement, option)
        for (const { el: element, top, left } of actions) {
            element.scrollTo({ top, left, behavior: "instant" })
        }
    }
    focus() {
        if (!isHighlightVisible(this)) {
            this.scrollIntoView({ block: "center", inline: "center" })
        }
        const focusable = this.queryInRange("a,input,button,details")
        if (focusable) focusable.focus()

        setNativeFocus(this.nativeRange, true)
        this.background = `rgba(255,127,255,0.5)`
        for (const node of this.children) {
            const element = node as HTMLElement
            element.style.background = this.background
        }
    }
    queryInRange(selector: string): HTMLElement | null {
        const range = this.range
        const rangeEndNode = range.endContainer

        // start and end of range is always text node because fromFindApi()

        const walker = document.createTreeWalker(
            document.documentElement,
            // eslint-disable-next-line no-bitwise
            NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
            {
                acceptNode(node) {
                    // stop when meet the end node; do not wait for no intersect.
                    // or the first match node
                    if (node.nodeType === Node.TEXT_NODE) {
                        if (node.isSameNode(rangeEndNode)) {
                            return NodeFilter.FILTER_ACCEPT
                        }
                        return NodeFilter.FILTER_SKIP
                    }
                    const element = node as Element
                    if (element.matches(selector)) {
                        return NodeFilter.FILTER_ACCEPT
                    } else return NodeFilter.FILTER_SKIP
                },
            },
        )

        walker.currentNode = range.startContainer
        if (walker.parentNode()) return walker.currentNode as HTMLElement
        if (range.startContainer.isSameNode(rangeEndNode)) return null
        if (walker.nextNode() && !walker.currentNode.isSameNode(rangeEndNode)) {
            return walker.currentNode as HTMLElement
        }
        return null
    }
}

customElements.define("find-highlight", FindHighlight, { extends: "span" })

const HIGHLIGHT_NAME = "tridactyl-find-highlight"
const ACTIVE_HIGHLIGHT_NAME = "tridactyl-find-highlight-active"
let nativeHighlights: { normal: Highlight; active: Highlight }

function isHighlightVisible(highlight: FindHighlight) {
    return DOM.isVisible(nativeHighlights ? highlight.range : highlight)
}

function setNativeFocus(range: Range, active: boolean) {
    if (!nativeHighlights) return
    nativeHighlights.normal[active ? "delete" : "add"](range)
    nativeHighlights.active[active ? "add" : "delete"](range)
}

function clearNativeHighlights() {
    if (!nativeHighlights) return
    if (CSS.highlights.get(HIGHLIGHT_NAME) === nativeHighlights.normal)
        CSS.highlights.delete(HIGHLIGHT_NAME)
    if (CSS.highlights.get(ACTIVE_HIGHLIGHT_NAME) === nativeHighlights.active)
        CSS.highlights.delete(ACTIVE_HIGHLIGHT_NAME)
    nativeHighlights = undefined
}

function highlightsDrawn() {
    if (!nativeHighlights) return !!host?.firstChild
    return (
        CSS.highlights.get(HIGHLIGHT_NAME) === nativeHighlights.normal &&
        CSS.highlights.get(ACTIVE_HIGHLIGHT_NAME) === nativeHighlights.active &&
        nativeHighlights.normal.size + nativeHighlights.active.size ===
            lastHighlights.length
    )
}

// Highlights corresponding to the last search
let lastHighlights
// Which element of `lastSearch` was last selected
let selected = 0

let HIGHLIGHT_TIMER
let REPOSITION_TIMER
const POSITION_OBSERVER = new MutationObserver(scheduleReposition)

function scheduleReposition() {
    if (!host?.firstChild) return
    clearTimeout(REPOSITION_TIMER)
    REPOSITION_TIMER = setTimeout(() => {
        repositionHighlight()
    }, 50)
}

window.addEventListener("resize", scheduleReposition)
window.addEventListener("scroll", scheduleReposition, true)

export async function jumpToMatch(searchQuery, option) {
    const timeout = config.get("findhighlighttimeout")
    if (timeout > 0) {
        clearTimeout(HIGHLIGHT_TIMER)
        HIGHLIGHT_TIMER = setTimeout(removeHighlighting, timeout)
    }
    // First, search for the query
    const findcase = config.get("findcase")
    const sensitive =
        findcase === "sensitive" ||
        (findcase === "smart" && /[A-Z]/.test(searchQuery))
    const results = await browserBg.find.find(searchQuery, {
        tabId: await activeTabId(),
        caseSensitive: sensitive,
        entireWord: false,
        includeRangeData: true,
    })
    state.lastSearchQuery = searchQuery
    lastHighlights = []
    removeHighlighting()

    // We need to grab all text nodes in order to find the corresponding element
    const walker = document.createTreeWalker(
        document,
        NodeFilter.SHOW_TEXT,
        null,
    )
    const nodes = []
    let node
    do {
        node = walker.nextNode()
        nodes.push(node)
    } while (node)

    for (let i = 0; i < results.count; ++i) {
        const range = results.rangeData[i]
        try {
            const high = FindHighlight.fromFindApi(range, nodes)
            lastHighlights.push(high)
        } catch (_) {} // Inaccessible range, eg cross-origin iframe - ignore
    }
    if (lastHighlights.length < 1) {
        throw new Error("Pattern not found: " + searchQuery)
    }
    drawHighlights(lastHighlights)
    lastHighlights.sort(
        option["reverse"] ? (a, b) => b.top - a.top : (a, b) => a.top - b.top,
    )

    if ("jumpTo" in option) {
        selected =
            (option["jumpTo"] + lastHighlights.length) % lastHighlights.length
        focusHighlight(selected)
        return
    }

    // Just reuse the code to find the first match in the view
    selected = 0
    if (isHighlightVisible(lastHighlights[selected])) {
        focusHighlight(selected)
    } else {
        const searchFromView = true
        await jumpToNextMatch(1, searchFromView)
    }
}

function drawHighlights(highlights) {
    if (NATIVE_HIGHLIGHTS) {
        const normal = new Highlight()
        highlights.forEach(highlight => normal.add(highlight.nativeRange))
        const active = new Highlight()
        normal.priority = 2147483646
        active.priority = 2147483647
        CSS.highlights.set(HIGHLIGHT_NAME, normal)
        CSS.highlights.set(ACTIVE_HIGHLIGHT_NAME, active)
        nativeHighlights = { normal, active }
        return
    }
    const host = getFindHost()
    highlights.forEach(elem => host.appendChild(elem))
}

export function removeHighlighting() {
    POSITION_OBSERVER.disconnect()
    clearTimeout(REPOSITION_TIMER)
    clearNativeHighlights()
    while (host?.firstChild) host.removeChild(host.firstChild)
}

export function focusHighlight(index) {
    lastHighlights[index].focus()
    if (nativeHighlights) return
    repositionHighlight()
    POSITION_OBSERVER.observe(document, {
        attributes: true,
        childList: true,
        characterData: true,
        subtree: true,
    })
}

export function repositionHighlight() {
    for (const node of lastHighlights) {
        node.updateRectsPosition()
    }
}

export async function jumpToNextMatch(n: number, searchFromView = false) {
    const lastSearchQuery = await State.getAsync("lastSearchQuery")
    if (!lastSearchQuery) return
    if (!lastHighlights) {
        await jumpToMatch(lastSearchQuery, { reverse: n < 0 })
        if (Math.abs(n) === 1) return
        n = n - n / Math.abs(n)
        searchFromView = false
    }
    if (!highlightsDrawn()) {
        const timeout = config.get("findhighlighttimeout")
        if (timeout > 0) {
            clearTimeout(HIGHLIGHT_TIMER)
            HIGHLIGHT_TIMER = setTimeout(removeHighlighting, timeout)
        }
        drawHighlights(lastHighlights)
    }
    if (lastHighlights[selected] === undefined) {
        removeHighlighting()
        throw new Error("Pattern not found: " + lastSearchQuery)
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    ;(lastHighlights[selected] as any).unfocus()

    if (!searchFromView || isHighlightVisible(lastHighlights[selected])) {
        // if the last selected is inside the view,
        // count nth match from the last selected.
        selected =
            (selected + n + lastHighlights.length) % lastHighlights.length
    } else {
        repositionHighlight()
        const length = lastHighlights.length
        const reverse = lastHighlights[length - 1].top < lastHighlights[0].top
        const negative = n < 0
        const downward = (!reverse && !negative) || (reverse && negative)
        const yOffset = window.pageYOffset + (downward ? 0 : window.innerHeight)
        const start = negative ? length - 1 : 0
        const increment = negative ? -1 : 1
        selected = (n - 1 + length) % length
        for (let i = start; i in lastHighlights; i += increment) {
            if (lastHighlights[i].top > yOffset == downward) {
                selected = (i + n - increment + length) % length
                break
            }
        }
    }

    focusHighlight(selected)
}

export function currentMatchRange(): Range {
    return lastHighlights[selected].range
}

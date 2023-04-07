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
    elem.style.position = "absolute"
    elem.style.top = "0px"
    elem.style.left = "0px"
    document.body.appendChild(elem)
    host = elem.attachShadow({ mode: "closed" })
    return host
}

class FindHighlight extends HTMLSpanElement {
    public top = Infinity

    constructor(public range: Range) {
        super()
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
        return new this(range)
    }

    updateRectsPosition() {
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
        }
    }

    getBoundingClientRect() {
        return this.range.getBoundingClientRect()
    }
    getClientRects() {
        return this.range.getClientRects()
    }
    unfocus() {
        for (const node of this.children) {
            ;(node as HTMLElement).style.background = `rgba(127,255,255,0.5)`
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
            element.scrollTop = top
            element.scrollLeft = left
        }
    }
    focus() {
        if (!DOM.isVisible(this)) {
            this.scrollIntoView({ block: "center", inline: "center" })
        }
        const focusable = this.queryInRange("a,input,button,details")
        if (focusable) focusable.focus()

        for (const node of this.children) {
            const element = node as HTMLElement
            element.style.background = `rgba(255,127,255,0.5)`
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

// Highlights corresponding to the last search
let lastHighlights
// Which element of `lastSearch` was last selected
let selected = 0

let HIGHLIGHT_TIMER

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
    const findPromise = await browserBg.find.find(searchQuery, {
        tabId: await activeTabId(),
        caseSensitive: sensitive,
        entireWord: false,
        includeRangeData: true,
        includeRectData: true,
    })
    state.lastSearchQuery = searchQuery
    lastHighlights = []
    removeHighlighting()

    // We need to grab all text nodes in order to find the corresponding element
    const walker = document.createTreeWalker(
        document,
        NodeFilter.SHOW_TEXT,
        null,
        false,
    )
    const nodes = []
    let node
    do {
        node = walker.nextNode()
        nodes.push(node)
    } while (node)

    const results = await findPromise

    const host = getFindHost()
    for (let i = 0; i < results.count; ++i) {
        const data = results.rectData[i]
        if (data.rectsAndTexts.rectList.length < 1) {
            // When a result does not have any rectangles, it's not visible
            continue
        }
        const range = results.rangeData[i]
        const high = FindHighlight.fromFindApi(range, nodes)
        host.appendChild(high)
        lastHighlights.push(high)
    }
    if (lastHighlights.length < 1) {
        throw new Error("Pattern not found: " + searchQuery)
    }
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
    if (DOM.isVisible(lastHighlights[selected])) {
        focusHighlight(selected)
    } else {
        const searchFromView = true
        await jumpToNextMatch(1, searchFromView)
    }
}

function drawHighlights(highlights) {
    const host = getFindHost()
    highlights.forEach(elem => host.appendChild(elem))
}

export function removeHighlighting() {
    const host = getFindHost()
    while (host.firstChild) host.removeChild(host.firstChild)
}

export function focusHighlight(index) {
    lastHighlights[index].focus()
    repositionHighlight()
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
    if (!host.firstChild) {
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

    if (!searchFromView || DOM.isVisible(lastHighlights[selected])) {
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

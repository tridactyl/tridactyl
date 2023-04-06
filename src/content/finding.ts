import * as config from "@src/lib/config"
import * as DOM from "@src/lib/dom"
import { browserBg, activeTabId } from "@src/lib/webext"
import state from "@src/state"
import * as State from "@src/state"

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

    constructor(private rects, public range: Range) {
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
        for (const rect of rects) {
            if (rect.top < this.top) {
                this.top = rect.top
            }
            const highlight = document.createElement("span")
            highlight.className = "TridactylFindHighlight"
            highlight.style.position = "absolute"
            highlight.style.top = `${rect.top}px`
            highlight.style.left = `${rect.left}px`
            highlight.style.width = `${rect.right - rect.left}px`
            highlight.style.height = `${rect.bottom - rect.top}px`
            highlight.style.zIndex = "2147483645"
            highlight.style.pointerEvents = "none"
            this.appendChild(highlight)
        }
        ;(this as any).unfocus()
    }

    static fromFindApi(rectData, rangeData, allTextNode: Text[]) {
        const range = document.createRange()
        range.setStart(
            allTextNode[rangeData.startTextNodePos],
            rangeData.startOffset,
        )
        range.setEnd(allTextNode[rangeData.endTextNodePos], rangeData.endOffset)
        return new this(rectData, range)
    }

    isVisible(): boolean {
        return DOM.isVisible(this.range)
    }
    unfocus() {
        for (const node of this.children) {
            ;(node as HTMLElement).style.background = `rgba(127,255,255,0.5)`
        }
    }
    focus() {
        if (!this.isVisible()) {
            this.children[0].scrollIntoView({
                block: "center",
                inline: "center",
            })
        }

        let parentElement = this.range.startContainer.parentElement
        loop: while (parentElement) {
            switch (parentElement.nodeName.toLowerCase()) {
                case "a":
                case "input":
                case "button":
                case "details":
                    parentElement.focus()
                    break loop
            }
            parentElement = parentElement.parentElement
        }

        for (const node of this.children) {
            ;(node as HTMLElement).style.background = `rgba(255,127,255,0.5)`
        }
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
        const high = FindHighlight.fromFindApi(
            data.rectsAndTexts.rectList,
            range,
            nodes,
        )
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
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        ;(lastHighlights[selected] as any).focus()
        return
    }

    // Just reuse the code to find the first match in the view
    selected = 0
    if (lastHighlights[selected].isVisible()) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        ;(lastHighlights[selected] as any).focus()
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

export async function jumpToNextMatch(n: number, searchFromView = false) {
    let lastSearchQuery
    if (!lastHighlights) {
        lastSearchQuery = await State.getAsync("lastSearchQuery")
        if (!lastSearchQuery) return
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

    if (!searchFromView || lastHighlights[selected].isVisible()) {
        // if the last selected is inside the view,
        // count nth match from the last selected.
        selected =
            (selected + n + lastHighlights.length) % lastHighlights.length
    } else {
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

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    ;(lastHighlights[selected] as any).focus()
}

export function currentMatchRange(): Range {
    return lastHighlights[selected].range
}

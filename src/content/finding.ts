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

    constructor(private rects, private node) {
        super()
        ;(this as any).unfocus = () => {
            for (const node of this.children) {
                ;(
                    node as HTMLElement
                ).style.background = `rgba(127,255,255,0.5)`
            }
        }
        ;(this as any).focus = () => {
            if (!DOM.isVisible(this.children[0])) {
                this.children[0].scrollIntoView({
                    block: "center",
                    inline: "center",
                })
            }
            let parentNode = this.node.parentNode
            while (parentNode && !(parentNode instanceof HTMLAnchorElement)) {
                parentNode = parentNode.parentNode
            }
            if (parentNode) {
                parentNode.focus()
            }
            for (const node of this.children) {
                ;(
                    node as HTMLElement
                ).style.background = `rgba(255,127,255,0.5)`
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
}

customElements.define("find-highlight", FindHighlight, { extends: "span" })

// Highlights corresponding to the last search
let lastHighlights
// Which element of `lastSearch` was last selected
let selected = 0

export async function jumpToMatch(searchQuery, reverse) {
    const timeout = config.get("findhighlighttimeout")
    timeout > 0 && setTimeout(removeHighlighting, timeout)
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
    let focused = false
    for (let i = 0; i < results.count; ++i) {
        const data = results.rectData[i]
        if (data.rectsAndTexts.rectList.length < 1) {
            // When a result does not have any rectangles, it's not visible
            continue
        }
        const range = results.rangeData[i]
        const high = new FindHighlight(
            data.rectsAndTexts.rectList,
            nodes[range.startTextNodePos],
        )
        host.appendChild(high)
        lastHighlights.push(high)
        if (!focused && DOM.isVisible(high)) {
            focused = true
            ;(high as any).focus()
            selected = lastHighlights.length - 1
        }
    }
    if (lastHighlights.length < 1) {
        throw new Error("Pattern not found: " + searchQuery)
    }
    lastHighlights.sort(
        reverse ? (a, b) => b.top - a.top : (a, b) => a.top - b.top,
    )
    if (!focused) {
        selected = 0
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        ;(lastHighlights[selected] as any).focus()
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

export async function jumpToNextMatch(n: number) {
    const lastSearchQuery = await State.getAsync("lastSearchQuery")
    if (!lastHighlights) {
        return lastSearchQuery ? jumpToMatch(lastSearchQuery, n < 0) : undefined
    }
    if (!host.firstChild) {
        drawHighlights(lastHighlights)
    }
    if (lastHighlights[selected] === undefined) {
        removeHighlighting()
        throw new Error("Pattern not found: " + lastSearchQuery)
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    ;(lastHighlights[selected] as any).unfocus()
    selected = (selected + n + lastHighlights.length) % lastHighlights.length
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    ;(lastHighlights[selected] as any).focus()
}

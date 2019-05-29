import * as config from "@src/lib/config"
import * as DOM from "@src/lib/dom"
import { browserBg, activeTabId } from "@src/lib/webext"
import state from "@src/state"

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
    host = elem.attachShadow({mode: "closed"})
    return host
}

function createHighlightingElement(rect) {
    const highlight = document.createElement("span")
    highlight.className = "TridactylSearchHighlight"
    highlight.style.position = "absolute"
    highlight.style.top = `${rect.top}px`
    highlight.style.left = `${rect.left}px`
    highlight.style.width = `${rect.right - rect.left}px`
    highlight.style.height = `${rect.bottom - rect.top}px`
    highlight.style.zIndex = "2147483645"
    unfocusHighlight(highlight)
    return highlight
}

function unfocusHighlight(high) {
    high.style.background = `rgba(127,255,255,0.5)`
}

function focusHighlight(high) {
    if (!DOM.isVisible(high)) {
        high.scrollIntoView()
    }
    high.style.background = `rgba(255,127,255,0.5)`
}

// Highlights corresponding to the last search
let lastHighlights
// Which element of `lastSearch` was last selected
let selected = 0

export async function jumpToMatch(searchQuery, reverse) {
    // First, search for the query
    const findcase = config.get("findcase")
    const sensitive = findcase === "sensitive" || (findcase === "smart" && searchQuery.match("[A-Z]"))
    state.lastSearchQuery = searchQuery
    lastHighlights = []
    const results = await browserBg.find.find(searchQuery, {
        tabId: await activeTabId(),
        caseSensitive: sensitive,
        entireWord: false,
        includeRectData: true,
    })
    // results are sorted by the order they appear in the page, we need them to
    // be sorted according to position instead
    const rectData = results
        .rectData
        .filter(data => data.rectsAndTexts.rectList.length > 0)
        .sort((a, b) => reverse
            ? b.rectsAndTexts.rectList[0].top - a.rectsAndTexts.rectList[0].top
            : a.rectsAndTexts.rectList[0].top - b.rectsAndTexts.rectList[0].top)
    if (rectData.length < 1) {
        removeHighlighting()
        throw new Error("Pattern not found: " + state.lastSearchQuery)
    }

    // Then, highlight it
    removeHighlighting()
    const host = getFindHost()
    let focused = false
    for (let i = 0; i < rectData.length; ++i) {
        const data = rectData[i]
        const highlights = []
        lastHighlights.push(highlights)
        for (const rect of data.rectsAndTexts.rectList) {
            const highlight = createHighlightingElement(rect)
            highlights.push(highlight)
            host.appendChild(highlight)
        }
        if (!focused && DOM.isVisible(highlights[0])) {
            focused = true
            focusHighlight(highlights[0])
            selected = i
        }
    }
    if (!focused) {
        focusHighlight(lastHighlights[0][0])
    }
}

function drawHighlights(highlights) {
    const host = getFindHost()
    highlights.forEach(elems => elems.forEach(elem => host.appendChild(elem)))
}

export function jumpToNextMatch(n: number) {
    if (!lastHighlights) {
        return state.lastSearchQuery ? jumpToMatch(state.lastSearchQuery, n < 0) : undefined
    }
    if (!host.firstChild) {
        drawHighlights(lastHighlights)
    }
    if (lastHighlights[selected] === undefined) {
        removeHighlighting()
        throw new Error("Pattern not found: " + state.lastSearchQuery)
    }
    unfocusHighlight(lastHighlights[selected][0])
    selected = (selected + n + lastHighlights.length) % lastHighlights.length
    focusHighlight(lastHighlights[selected][0])
}

export function removeHighlighting() {
    const host = getFindHost();
    while (host.firstChild) host.removeChild(host.firstChild)
}

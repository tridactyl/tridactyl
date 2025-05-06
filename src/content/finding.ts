import * as config from "@src/lib/config"
import * as DOM from "@src/lib/dom"
import { browserBg, ownTabId } from "@src/lib/webext"
import state from "@src/state"
import * as State from "@src/state"
import { compute as scrollCompute } from "compute-scroll-into-view"
/* eslint-disable unsupported-apis-firefox-android */

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
    private background = `var(--tridactyl-search-highlight-color)`

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
        const rects = this.getClientRects()
        if (!rects.length) throw new Error("Range has no rects")
        this.updateRectsPosition(rects)
        ;(this as any).unfocus()
    }

    static fromFindApi(found, allTextNode: Text[]) {
        const range = allTextNode[0].ownerDocument.createRange()
        range.setStart(allTextNode[found.startTextNodePos], found.startOffset)
        range.setEnd(allTextNode[found.endTextNodePos], found.endOffset)
        return new this(range)
    }

    updateRectsPosition(rects = this.getClientRects()) {
        if (NATIVE_HIGHLIGHTS) {
            this.top = Array.from(rects).reduce((top, rect) =>
                rect.width || rect.height ? Math.min(top, rect.top) : top, Infinity) + window.pageYOffset
            return
        }
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
            highlight.style.opacity = "0.5"
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
        setNativeFocus(this.range, false)
        this.background = `var(--tridactyl-search-highlight-color)`
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
            if (preview && !preview.scrolls.has(element))
                preview.scrolls.set(element, [
                    element.scrollLeft,
                    element.scrollTop,
                ])
            element.scrollTo({ top, left, behavior: "instant" })
        }
    }
    focusMatch(focusElement = true, scroll = true) {
        if (scroll && !isHighlightVisible(this)) {
            this.scrollIntoView({ block: "center", inline: "center" })
        }
        const focusable = this.queryInRange("a,input,button,details")
        if (focusElement && focusable) focusable.focus()
        setNativeFocus(this.range, true)
        this.background = `var(--tridactyl-search-highlight-active-color)`
        for (const node of this.children) {
            const element = node as HTMLElement
            element.style.background = this.background
        }
    }
    queryInRange(selector: string): HTMLElement | null {
        const range = this.range
        const rangeEndNode = range.endContainer
        if (range.startContainer.ownerDocument !== document) return null

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
let nativeRegistry = CSS.highlights

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
    if (nativeRegistry.get(HIGHLIGHT_NAME) === nativeHighlights.normal)
        nativeRegistry.delete(HIGHLIGHT_NAME)
    if (nativeRegistry.get(ACTIVE_HIGHLIGHT_NAME) === nativeHighlights.active)
        nativeRegistry.delete(ACTIVE_HIGHLIGHT_NAME)
    nativeHighlights = undefined
}

function highlightsDrawn() {
    if (!nativeHighlights) return !!host?.firstChild
    return (
        nativeRegistry.get(HIGHLIGHT_NAME) === nativeHighlights.normal &&
        nativeRegistry.get(ACTIVE_HIGHLIGHT_NAME) === nativeHighlights.active &&
        nativeHighlights.normal.size + nativeHighlights.active.size ===
            lastHighlights.length
    )
}

// Highlights corresponding to the last search
let lastHighlights
// Which element of `lastSearch` was last selected
let selected = 0
let preview
let searchGeneration = 0
let regexSnapshots
let regexSnapshotObservers: MutationObserver[] = []

let HIGHLIGHT_TIMER
let REPOSITION_TIMER
const POSITION_OBSERVER = new MutationObserver(scheduleReposition)

function resetHighlightTimer() {
    clearTimeout(HIGHLIGHT_TIMER)
    const timeout = config.get("findhighlighttimeout")
    if (timeout > 0) HIGHLIGHT_TIMER = setTimeout(removeHighlighting, timeout)
}

function scheduleReposition() {
    if (!host?.firstChild) return
    clearTimeout(REPOSITION_TIMER)
    REPOSITION_TIMER = setTimeout(() => {
        repositionHighlight()
    }, 50)
}

window.addEventListener("resize", scheduleReposition)
window.addEventListener("resize", clearRegexSnapshots)
window.addEventListener("scroll", scheduleReposition, true)

function clearRegexSnapshots() {
    regexSnapshots = undefined
    regexSnapshotObservers.splice(0).forEach(observer => observer.disconnect())
}

async function yieldFind(generation) {
    await new Promise(resolve => setTimeout(resolve))
    return generation !== searchGeneration
}

function getRegexSnapshots(documents, cache: boolean) {
    if (cache && regexSnapshots?.length === documents.length &&
        regexSnapshots.every((snapshot, index) => snapshot.doc === documents[index])) return regexSnapshots
    if (!NATIVE_HIGHLIGHTS) getFindHost()
    const snapshots = documents.map(doc => {
        if (!doc) return { doc, nodes: [], lengths: [], text: "" }
        const painted = new WeakMap<HTMLElement, boolean>()
        const walker = doc.createTreeWalker(doc, NodeFilter.SHOW_TEXT)
        const nodes = []
        const lengths = []
        const parts = []
        while (walker.nextNode()) {
            const node = walker.currentNode as Text
            const parent = node.parentElement
            if (!painted.has(parent)) painted.set(parent, DOM.isPainted(parent))
            if (painted.get(parent)) {
                nodes.push(node)
                lengths.push(node.length)
                parts.push(node.data)
            }
        }
        return { doc, nodes, lengths, text: parts.join("") }
    })
    if (cache) {
        clearRegexSnapshots()
        regexSnapshots = snapshots
        regexSnapshotObservers = documents.filter(Boolean).map(doc => {
            const observer = new MutationObserver(changes => {
                if (changes.some(({ target }) =>
                    !(target as Element).closest?.("#cmdline_iframe,#TridactylFindHost")))
                    clearRegexSnapshots()
            })
            observer.observe(doc, {
                attributes: true,
                childList: true,
                characterData: true,
                subtree: true,
            })
            return observer
        })
    }
    return snapshots
}

export async function jumpToMatch(searchQuery, option) {
    const previewing = option["preview"] === true
    const generation = ++searchGeneration
    if (!previewing) {
        preview = undefined
        clearRegexSnapshots()
    }
    clearTimeout(HIGHLIGHT_TIMER)
    // First, search for the query
    const literal = option["regex"] && searchQuery.match(/^\/(.*)\/([^/]*)$/s)
    let [source, flags] = literal ? literal.slice(1) : [searchQuery, ""]
    let sensitive = option["caseSensitive"]
    if (sensitive === undefined) {
        const findcase = config.get("findcase")
        sensitive =
            !flags.includes("i") &&
            (findcase === "sensitive" ||
                (findcase === "smart" && /[A-Z]/.test(source)))
    }
    flags = flags.replace(/[gi]/g, "") + "g" + (sensitive ? "" : "i")
    const regex = option["regex"] && new RegExp(source, flags)
    let results: any = { count: 0 }
    if (!regex)
        results = await browserBg.find.find(searchQuery, {
            tabId: await ownTabId(),
            caseSensitive: sensitive,
            entireWord: false,
            includeRangeData: true,
        })
    if (generation !== searchGeneration) return
    if (!previewing) {
        state.lastSearchQuery = searchQuery
        state.lastSearchRegex = regex?.flags
    }
    lastHighlights = []
    clearHighlighting()

    const documents = [document, ...DOM.getAllDocumentFrames().map(frame => frame.contentDocument)]
    const snapshots = regex && getRegexSnapshots(documents, previewing)
    const nodeSets = regex ? [] : documents.map(doc => {
        if (!doc) return []
        const walker = doc.createTreeWalker(doc, NodeFilter.SHOW_TEXT)
        const nodes = []
        while (walker.nextNode()) nodes.push(walker.currentNode)
        return nodes
    })

    if (regex) {
        const found = []
        let converted = 0
        for (const { nodes, lengths, text } of snapshots) {
            let nodeIndex = 0
            let nodeOffset = 0
            for (const match of text.matchAll(regex)) {
                if (++converted % 100 === 0 && await yieldFind(generation)) return
                if (!match[0]) continue
                try {
                    const end = match.index + match[0].length
                    while (match.index >= nodeOffset + lengths[nodeIndex])
                        nodeOffset += lengths[nodeIndex++]
                    const range = nodes[0].ownerDocument.createRange()
                    range.setStart(nodes[nodeIndex], match.index - nodeOffset)
                    while (end > nodeOffset + lengths[nodeIndex])
                        nodeOffset += lengths[nodeIndex++]
                    range.setEnd(nodes[nodeIndex], end - nodeOffset)
                    if (range.toString() !== match[0]) continue
                    found.push(new FindHighlight(range))
                } catch (_) {}
            }
        }
        lastHighlights = found
    }
    for (let i = 0; i < results.count; ++i) {
        const range = results.rangeData[i]
        for (const nodes of nodeSets) {
            try {
                const high = FindHighlight.fromFindApi(range, nodes)
                lastHighlights.push(high)
                break
            } catch (_) {} // Inaccessible range, eg cross-origin iframe - ignore
        }
    }
    if (lastHighlights.length < 1) {
        throw new Error("Pattern not found: " + searchQuery)
    }
    drawHighlights(lastHighlights)
    if (!previewing) resetHighlightTimer()
    lastHighlights.sort(
        option["reverse"] ? (a, b) => b.top - a.top : (a, b) => a.top - b.top,
    )

    if ("jumpTo" in option) {
        selected =
            (option["jumpTo"] + lastHighlights.length) % lastHighlights.length
        focusHighlight(selected, !previewing)
        return
    }

    // Just reuse the code to find the first match in the view
    selected = 0
    if (isHighlightVisible(lastHighlights[selected])) {
        focusHighlight(selected, !previewing)
    } else {
        const searchFromView = true
        await jumpToNextMatch(1, searchFromView)
    }
}

function drawHighlights(highlights) {
    if (NATIVE_HIGHLIGHTS) {
        const doc = highlights[0].range.startContainer.ownerDocument
        const win: any = doc.defaultView
        const normal = new win.Highlight()
        highlights.forEach(highlight => normal.add(highlight.range))
        const active = new win.Highlight()
        nativeRegistry = win.CSS.highlights
        normal.priority = 2147483646
        active.priority = 2147483647
        nativeRegistry.set(HIGHLIGHT_NAME, normal)
        nativeRegistry.set(ACTIVE_HIGHLIGHT_NAME, active)
        nativeHighlights = { normal, active }
        return
    }
    const host = getFindHost()
    highlights.forEach(elem => host.appendChild(elem))
}

function clearHighlighting() {
    POSITION_OBSERVER.disconnect()
    clearTimeout(REPOSITION_TIMER)
    clearNativeHighlights()
    while (host?.firstChild) host.removeChild(host.firstChild)
}

function restorePreviewScrolls(snapshot = preview) {
    for (const [element, [left, top]] of snapshot?.scrolls || [])
        element.scrollTo({ left, top, behavior: "instant" })
}

function truncateFindContext(text: string, length: number, before: boolean) {
    if (length < 1 || text.length <= length) return text.slice(0, length)
    if (before) {
        let start = text.length - length
        while (start > 0 && !/[\s.]/.test(text[start - 1])) --start
        return text.slice(start)
    }
    let end = length
    while (end < text.length && !/[\s.]/.test(text[end])) ++end
    if (text[end] === ".") ++end
    return text.slice(0, end)
}

async function findCompletionMatches(generation) {
    const limit = config.get("findresults")
    const contextLength = Math.max(0, config.get("findcontextlen"))
    const highlights =
        limit < 0 ? lastHighlights : lastHighlights.slice(0, limit)
    const matches = []
    const headingIndexes = new Map()
    for (let index = 0; index < highlights.length; ++index) {
        const highlight = highlights[index]
        const range = highlight.range
        const doc: Document = range.startContainer.ownerDocument
        const walker = doc.createTreeWalker(doc, NodeFilter.SHOW_TEXT)
        walker.currentNode = range.startContainer
        let precontext = (range.startContainer as Text).data.slice(
            0,
            range.startOffset,
        )
        while (precontext.length < contextLength && walker.previousNode())
            precontext = (walker.currentNode as Text).data + precontext
        const preTruncated =
            contextLength > 0 &&
            (precontext.length > contextLength || !!walker.previousNode())
        walker.currentNode = range.endContainer
        let postcontext = (range.endContainer as Text).data.slice(
            range.endOffset,
        )
        while (postcontext.length < contextLength && walker.nextNode())
            postcontext += (walker.currentNode as Text).data
        const postTruncated =
            contextLength > 0 &&
            (postcontext.length > contextLength || !!walker.nextNode())
        precontext = truncateFindContext(precontext, contextLength, true)
        postcontext = truncateFindContext(postcontext, contextLength, false)
        let headingIndex = headingIndexes.get(doc)
        if (!headingIndex) {
            const headings = Array.from(doc.querySelectorAll("h1,h2,h3,h4,h5,h6"))
            const hierarchy = []
            const breadcrumbs = new Map()
            for (const heading of headings) {
                hierarchy.length = Number(heading.tagName[1]) - 1
                hierarchy.push(heading.textContent?.replace(/\s+/g, " ").trim())
                breadcrumbs.set(heading, hierarchy.filter(Boolean).join(" > "))
            }
            headingIndex = { headings, breadcrumbs }
            headingIndexes.set(doc, headingIndex)
        }
        const parent = (range.startContainer as Text).parentElement
        let heading = parent.closest("h1,h2,h3,h4,h5,h6")
        let start = 0
        let end = headingIndex.headings.length
        while (!heading && start < end) {
            const middle = Math.floor((start + end) / 2)
            if (
                headingIndex.headings[middle].compareDocumentPosition(
                    range.startContainer,
                ) === Node.DOCUMENT_POSITION_FOLLOWING
            )
                start = middle + 1
            else end = middle
        }
        heading ||= headingIndex.headings[start - 1]
        const root = doc.scrollingElement || doc.documentElement
        const top = range.getBoundingClientRect().top + doc.defaultView.scrollY
        const percent = Math.round((top / Math.max(1, root.scrollHeight)) * 100)
        matches.push({
            index,
            text: range.toString(),
            precontext: (preTruncated ? "..." : "") + precontext,
            postcontext: postcontext + (postTruncated ? "..." : ""),
            breadcrumbs: headingIndex.breadcrumbs.get(heading) || "",
            position: `${Math.min(100, Math.max(0, percent))}%`,
        })
        if (index % 100 === 99 && await yieldFind(generation)) return []
    }
    return matches
}

export async function previewMatch(
    session: number,
    searchQuery,
    option,
    completions = true,
    keepScroll = false,
) {
    if (preview?.session !== session) {
        if (preview) cancelPreview(preview.session)
        preview = {
            session,
            highlights: lastHighlights,
            selected,
            drawn: highlightsDrawn(),
            scrolls: new Map(),
        }
    }
    if (keepScroll && lastHighlights?.length && "jumpTo" in option) {
        lastHighlights[selected].unfocus()
        selected = (option["jumpTo"] + lastHighlights.length) % lastHighlights.length
        return focusHighlight(selected, false)
    }
    if (!keepScroll) restorePreviewScrolls()
    const generation = searchGeneration + 1
    try {
        await jumpToMatch(searchQuery, { ...option, preview: true })
        if (preview?.session !== session || generation !== searchGeneration)
            return []
        return completions ? await findCompletionMatches(generation) : []
    } catch (_) {
        if (preview?.session === session && generation === searchGeneration) {
            clearHighlighting()
            lastHighlights = []
            restorePreviewScrolls()
        }
        return []
    }
}

export function cancelPreview(session: number) {
    if (preview?.session !== session) return
    ++searchGeneration
    clearRegexSnapshots()
    clearHighlighting()
    const snapshot = preview
    preview = undefined
    lastHighlights = snapshot.highlights
    selected = snapshot.selected
    if (snapshot.drawn && lastHighlights?.length) {
        drawHighlights(lastHighlights)
        focusHighlight(selected, false, false)
        resetHighlightTimer()
    }
    restorePreviewScrolls(snapshot)
}

export function removeHighlighting() {
    if (preview) cancelPreview(preview.session)
    else ++searchGeneration
    clearTimeout(HIGHLIGHT_TIMER)
    clearHighlighting()
}

export function focusHighlight(index, focusElement = true, scroll = true) {
    lastHighlights[index].focusMatch(focusElement, scroll)
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
    const generation = searchGeneration
    const lastSearchQuery = await State.getAsync("lastSearchQuery")
    const lastRegex = await State.getAsync("lastSearchRegex")
    if (generation !== searchGeneration) return
    if (!lastSearchQuery) return
    if (!lastHighlights) {
        const rebuildGeneration = searchGeneration + 1
        await jumpToMatch(lastSearchQuery, {
            reverse: n < 0,
            regex: !!lastRegex,
            caseSensitive: lastRegex ? !lastRegex.includes("i") : undefined,
        })
        if (rebuildGeneration !== searchGeneration) return
        if (Math.abs(n) === 1) return
        n = n - n / Math.abs(n)
        searchFromView = false
    }
    if (!highlightsDrawn()) {
        resetHighlightTimer()
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

    focusHighlight(selected, !preview)
}

export function currentMatchRange(): Range {
    return lastHighlights[selected].range.cloneRange()
}

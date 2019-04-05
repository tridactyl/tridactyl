// This file has various utilities used by the completion source for the find excmd
import * as Messaging from "@src/lib/messaging"
import * as config from "@src/lib/config"
import * as DOM from "@src/lib/dom"
import state from "@src/state"
import { zip } from "@src/lib/itertools"
import { browserBg, activeTabId } from "@src/lib/webext"

export class Match {
    constructor(
        public index,
        public rangeData,
        public rectData,
        public precontext,
        public postcontext,
        public firstNode,
    ) {}
}

function isCommandLineNode(n) {
    let url = n.ownerDocument.location.href
    return (
        url.protocol == "moz-extension:" &&
        url.pathname == "/static/commandline.html"
    )
}

/** Get all text nodes within the page.
    TODO: cache the results. I tried to do it but since we need to invalidate the cache when nodes are added/removed from the page, the results are constantly being invalidated by the completion buffer.
    The solution is obviously to pass `document.body` to createTreeWalker instead of just `document` but then you won't get all the text nodes in the page and this is a big problem because the results returned by browser.find.find() need absolutely all nodes existing within the page, even the ones belonging the commandline. */
function getNodes() {
    let nodes = []
    let walker = document.createTreeWalker(
        document,
        NodeFilter.SHOW_TEXT,
        null,
        false,
    )
    let node = walker.nextNode()
    do {
        nodes.push(node)
        node = walker.nextNode()
    } while (node)

    return nodes
}

let lastMatches = []
/** Given "findings", an array matching the one returned by find(), will compute the context for every match in findings and prune the matches than happened in Tridactyl's command line. ContextLength is how many characters from before and after the match should be included into the returned Match object.
 getMatches() will save its returned values in lastMatches. This is important for caching purposes in jumpToMatch, read its documentation to get the whole picture. */
export function getMatches(findings, contextLength = 10): Match[] {
    let result = []

    if (findings.length == 0) { return result }

    // Checks if a node belongs to the command line
    let nodes = getNodes()

    for (let i = 0; i < findings.length; ++i) {
        let range = findings[i][0]
        let firstnode = nodes[range.startTextNodePos]
        let lastnode = nodes[range.endTextNodePos]
        // We never want to match against nodes in the command line
        if (
            !firstnode ||
            !lastnode ||
            isCommandLineNode(firstnode) ||
            isCommandLineNode(lastnode) ||
            !DOM.isVisible(firstnode)
        ) {
            continue
        }

        // Get the context before the match
        let precontext = firstnode.textContent.substring(
            range.startOffset - contextLength,
            range.startOffset,
        )
        if (precontext.length < contextLength) {
            let missingChars = contextLength - precontext.length
            let id = range.startTextNodePos - 1
            while (missingChars > 0 && nodes[id]) {
                let txt = nodes[id].textContent
                precontext =
                    txt.substring(txt.length - missingChars, txt.length) +
                    precontext
                missingChars = contextLength - precontext.length
                id -= 1
            }
        }

        // Get the context after the match
        let postcontext = lastnode.textContent.substr(
            range.endOffset,
            contextLength,
        )
        // If the last node doesn't have enough context and if there's a node after it
        if (
            postcontext.length < contextLength &&
            nodes[range.endTextNodePos + 1]
        ) {
            // Add text from the following text node to the context
            postcontext += nodes[range.endTextNodePos + 1].textContent.substr(
                0,
                contextLength - postcontext.length,
            )
        }

        result.push(
            new Match(
                i,
                findings[i][0],
                findings[i][1],
                precontext,
                postcontext,
                firstnode,
            ),
        )
    }

    lastMatches = result
    return result
}

let prevFind = null
let findCount = 0
/** Performs a call to browser.find.find() with the right parameters and returns the result as a zipped array of rangeData and rectData (see browser.find.find's documentation) sorted according to their vertical position within the document.
 If count is different from -1 and lower than the number of matches returned by browser.find.find(), will return count results. Note that when this happens, `matchesCacheIsValid ` is set to false, which will prevent `jumpToMatch` from using cached matches. */
export async function find(query, count = -1, reverse = false) {
    findCount += 1
    let findId = findCount
    let findcase = await config.getAsync("findcase")
    let caseSensitive =
        findcase == "sensitive" ||
        (findcase == "smart" && query.search(/[A-Z]/) >= 0)
    let tabId = await activeTabId()

    // No point in searching for something that won't be used anyway
    await prevFind
    if (findId != findCount) { return [] }

    prevFind = browserBg.find.find(query, {
        tabId,
        caseSensitive,
        includeRangeData: true,
        includeRectData: true,
    })
    let findings = await prevFind
    findings = zip(findings.rangeData, findings.rectData).sort(
        (a: any, b: any) => {
            a = a[1].rectsAndTexts.rectList[0]
            b = b[1].rectsAndTexts.rectList[0]
            if (!a || !b) { return 0 }
            return a.top - b.top
        },
    )

    let finder = e =>
        e[1].rectsAndTexts.rectList[0] &&
        e[1].rectsAndTexts.rectList[0].top > window.pageYOffset
    if (reverse) {
        findings = findings.reverse()
        finder = e =>
            e[1].rectsAndTexts.rectList[0] &&
            e[1].rectsAndTexts.rectList[0].top < window.pageYOffset
    }

    let pivot = findings.indexOf(findings.find(finder))
    findings = findings.slice(pivot).concat(findings.slice(0, pivot))

    if (count != -1 && count < findings.length) { return findings.slice(0, count) }

    return findings
}

function createHighlightingElement(rect) {
    let e = document.createElement("div")
    e.className = "cleanslate TridactylSearchHighlight"
    e.setAttribute(
        "style",
        `
        display: block !important;
        position: absolute !important;
        top:    ${rect.top}px !important;
        left:   ${rect.left}px !important;
        width:  ${rect.right - rect.left}px !important;
        height: ${rect.bottom - rect.top}px !important;
    `,
    )
    return e
}

export function removeHighlighting(all = true) {
    if (all) { browserBg.find.removeHighlighting() }
    highlightingElements.forEach(e => e.parentNode.removeChild(e))
    highlightingElements = []
}

/* Scrolls to the first visible node.
 * i is the id of the node that should be scrolled to in allMatches
 * direction is +1 if going forward and -1 if going backawrd
 */
export function findVisibleNode(allMatches, i, direction) {
    if (allMatches.length < 1) { return undefined }

    let match = allMatches[i]
    let n = i

    do {
        while (!match.firstNode.ownerDocument.contains(match.firstNode)) {
            n += direction
            match = lastMatches[n]
            if (n == i) { return null }
        }
        match.firstNode.parentNode.scrollIntoView()
    } while (!DOM.isVisible(match.firstNode.parentNode))

    return match
}

function focusMatch(match: Match) {
    let elem = match.firstNode
    while (elem && !(elem.focus instanceof Function)) { elem = elem.parentElement }
    if (elem) {
        // We found a focusable element, but it's more important to focus anchors, even if they're higher up the DOM. So let's see if we can find one
        let newElem = elem
        while (newElem && newElem.tagName != "A") { newElem = newElem.parentNode }
        if (newElem) {
            newElem.focus()
        } else {
            elem.focus()
        }
    }
}

let lastMatch = 0
let highlightingElements = []
/* Jumps to the startingFromth dom node matching pattern */
export async function jumpToMatch(pattern, reverse, startingFrom) {
    removeHighlighting(false)
    let match

    // When we already computed all the matches, don't recompute them
    if (lastMatches[0] && lastMatches[0].rangeData.text == pattern) {
        match = lastMatches[startingFrom]
    }

    if (!match) {
        lastMatches = getMatches(await find(pattern, -1, reverse))
        match = lastMatches[startingFrom]
    }

    if (!match) { return }

    // Note: using this function can cause bugs, see
    // https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/find/highlightResults
    // Ideally we should reimplement our own highlighting
    browserBg.find.highlightResults()

    match = findVisibleNode(lastMatches, startingFrom, reverse ? -1 : 1)

    for (let rect of match.rectData.rectsAndTexts.rectList) {
        let elem = createHighlightingElement(rect)
        highlightingElements.push(elem)
        document.body.appendChild(elem)
    }

    focusMatch(match)

    // Remember where we where and what actions we did. This is need for jumpToNextMatch
    lastMatch = lastMatches.indexOf(match)
}

export function jumpToNextMatch(n: number) {
    removeHighlighting(false)

    if (lastMatches.length < 1) {
        // Let's try to find new matches
        return jumpToMatch(state.lastSearch, n == -1, 0)
    }

    browserBg.find.highlightResults()
    let match = findVisibleNode(
        lastMatches,
        (n + lastMatch + lastMatches.length) % lastMatches.length,
        n <= 0 ? -1 : 1,
    )

    if (match == undefined) {
        throw `No matches found. The pattern looked for doesn't exist or ':find' hasn't been run yet`
    }

    for (let rect of match.rectData.rectsAndTexts.rectList) {
        let elem = createHighlightingElement(rect)
        highlightingElements.push(elem)
        document.body.appendChild(elem)
    }

    focusMatch(match)

    lastMatch = lastMatches.indexOf(match)
}

import * as SELF from "@src/content/finding.ts"
Messaging.addListener("finding_content", Messaging.attributeCaller(SELF))

// This file has various utilities used by the completion source for the find excmd
import * as Messaging from "./messaging"
import * as config from "./config"
import * as DOM from "./dom"
import { browserBg, activeTabId } from "./lib/webext"

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
/** Given "findings", an object matching the ones returned by browser.find.find(), will compute the context for every match in findings and prune the matches than happened in Tridactyl's command line. ContextLength is how many characters from before and after the match should be included into the returned Match object.
 getMatches() will save its returned values in lastMatches. This is important for caching purposes in jumpToMatch, read its documentation to get the whole picture. */
export function getMatches(findings, contextLength = 10): Match[] {
    let result = []

    if (findings.count == 0) return result

    if (!findings.rangeData)
        throw new Error("Can't get matches without range data!")

    // Helper function to create matches. This avoids a `if` in the loop below
    let constructMatch = (findings, i, precontext, postcontext, node) =>
        new Match(
            i,
            findings.rangeData[i],
            findings.rectData[i],
            precontext,
            postcontext,
            node,
        )
    if (!findings.rectData)
        constructMatch = (findings, i, precontext, postcontext, node) =>
            new Match(
                i,
                findings.rangeData[i],
                null,
                precontext,
                postcontext,
                node,
            )

    // Checks if a node belongs to the command line
    let nodes = getNodes()

    for (let i = 0; i < findings.count; ++i) {
        let range = findings.rangeData[i]
        let firstnode = nodes[range.startTextNodePos]
        let lastnode = nodes[range.endTextNodePos]
        // We never want to match against nodes in the command line
        if (
            !firstnode ||
            !lastnode ||
            isCommandLineNode(firstnode) ||
            isCommandLineNode(lastnode)
        )
            continue

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
            constructMatch(findings, i, precontext, postcontext, firstnode),
        )
    }

    if (result[0] && cachedQuery != result[0].rangeData.text)
        matchesCacheIsValid = false

    console.log(result[0])
    result.sort((a, b) => {
        a = a.rectData.rectsAndTexts.rectList[0]
        b = b.rectData.rectsAndTexts.rectList[0]
        if (!a || !b) return 0
        return a.top - b.top
    })

    return result
}

let matchesCacheIsValid = false
let cachedQuery = ""
/** Performs a call to browser.find.find() with the right parameters.
 If count is different from -1 and lower than the number of matches returned by browser.find.find(), will return count results. Note that when this happens, `matchesCacheIsValid ` is set to false, which will prevent `jumpToMatch` from using cached matches. */
export async function find(
    query,
    count = -1,
    reverse = false,
): Promise<findResult> {
    let findcase = await config.getAsync("findcase")
    let caseSensitive =
        findcase == "sensitive" ||
        (findcase == "smart" && query.search(/[A-Z]/) >= 0)
    let tabId = await activeTabId()
    let findings = await browserBg.find.find(query, {
        tabId,
        caseSensitive,
        includeRangeData: true,
        includeRectData: true,
    })
    if (reverse) {
        findings.rangeData = findings.rangeData.reverse()
        findings.rectData = findings.rectData.reverse()
    }
    if (count != -1 && count < findings.count) {
        findings.count = count
        findings.rangeData = findings.rangeData.slice(0, findings.count)
        findings.rectData = findings.rectData.slice(0, findings.count)
        matchesCacheIsValid = false
    } else {
        matchesCacheIsValid = true
    }
    cachedQuery = query
    return findings
}

function createHighlightingElement(rect) {
    let e = document.createElement("div")
    e.className = "TridactylSearchHighlight"
    e.style.display = "block"
    e.style.position = "absolute"
    e.style.top = rect.top + "px"
    e.style.left = rect.left + "px"
    e.style.width = rect.right - rect.left + "px"
    e.style.height = rect.bottom - rect.top + "px"
    return e
}

export function removeHighlighting(all = true) {
    if (all) browserBg.find.removeHighlighting()
    highlightingElements.forEach(e => e.parentNode.removeChild(e))
    highlightingElements = []
}

/* Scrolls to the first visible node.
 * i is the id of the node that should be scrolled to in allMatches
 * direction is +1 if going forward and -1 if going backawrd
 */
export function findVisibleNode(allMatches, i, direction) {
    let match = allMatches[i]
    let n = i

    do {
        while (!match.firstNode.ownerDocument.contains(match.firstNode)) {
            n += direction
            match = lastMatches[n]
            if (n == i) return null
        }
        match.firstNode.parentNode.scrollIntoView()
        console.log(match)
    } while (!DOM.isVisible(match.firstNode.parentNode))

    return match
}

let lastMatch = 0
let lastReverse = false
let highlightingElements = []
/* Jumps to the startingFromth dom node matching pattern */
export async function jumpToMatch(pattern, reverse, startingFrom) {
    removeHighlighting(false)
    let match

    // When we already computed all the matches, don't recompute them
    if (matchesCacheIsValid && pattern == cachedQuery)
        match = lastMatches[startingFrom]

    if (!match) {
        lastMatches = getMatches(await find(pattern, -1, reverse))
        match = lastMatches[startingFrom]
    }

    if (!match) return

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

    // Remember where we where and what actions we did. This is need for jumpToNextMatch
    lastMatch = lastMatches.indexOf(match)
    lastReverse = reverse
}

export function jumpToNextMatch(n: number) {
    removeHighlighting(false)

    if (lastReverse) n *= -1

    browserBg.find.highlightResults()
    let match = findVisibleNode(
        lastMatches,
        (n + lastMatch + lastMatches.length) % lastMatches.length,
        n <= 0 ? -1 : 1,
    )

    for (let rect of match.rectData.rectsAndTexts.rectList) {
        let elem = createHighlightingElement(rect)
        highlightingElements.push(elem)
        document.body.appendChild(elem)
    }

    lastMatch = lastMatches.indexOf(match)
}

import * as SELF from "./finding_content"
Messaging.addListener("finding_content", Messaging.attributeCaller(SELF))

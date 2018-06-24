// This file has various utilities used by the completion source for the find excmd
import * as Messaging from "./messaging"
import * as config from "./config"
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

    if (cachedQuery != result[0].rangeData.text) matchesCacheIsValid = false
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

let lastMatch = 0
let lastReverse = false
/* Jumps to the startingFromth dom node matching pattern */
export async function jumpToMatch(pattern, reverse, startingFrom) {
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

    // Here, we make sure that the current match hasn't been removed from its owner document
    // If it has, we try to find the next/previous node that is still in the document
    let n = startingFrom
    while (!match.firstNode.ownerDocument.contains(match.firstNode)) {
        n += reverse ? -1 : 1
        match = lastMatches[startingFrom]
        if (n == startingFrom) return
    }

    match.firstNode.parentNode.scrollIntoView()
    // Remember where we where and what actions we did. This is need for jumpToNextMatch
    lastMatch = n
    lastReverse = reverse
}

export function jumpToNextMatch(n: number) {
    if (lastReverse) n *= -1
    n = (n + lastMatch + lastMatches.length) % lastMatches.length
    let match = lastMatches[n]
    browserBg.find.highlightResults()
    match.firstNode.parentNode.scrollIntoView()
    lastMatch = n
}

import * as SELF from "./finding_content"
Messaging.addListener("finding_content", Messaging.attributeCaller(SELF))

// This file has various utilities used by the completion source for the find excmd
import * as Messaging from "./messaging"

export class Match {
    constructor(public rangeData, public rectData, public precontext, public postcontext){}
}

function isCommandLineNode(n) {
    let url = n.ownerDocument.location.href
    return url.protocol == "moz-extension:" && url.pathname == "/static/commandline.html"
}

// We cache these results because walking the tree can be quite expensive when there's a lot of nodes
// TODO: Implement cache invalidation using a MutationObserver to track nodes being added to or removed from the DOM
let nodes = null
function getNodes() {
    // if (nodes != null)
    //     return nodes
    nodes = []
    let walker = document.createTreeWalker(document, NodeFilter.SHOW_TEXT, null, false);
    let node = walker.nextNode()
    do {
        nodes.push(node);
        node = walker.nextNode()
    } while (node)

    return nodes;
}

/** Given "findings", an object matching the ones returned by browser.find.find(), will compute the context for every match in findings and prune the matches than happened in Tridactyl's command line. ContextLength is how many from before and after the match should be included into the returned Match object */
export function getMatches(findings, contextLength = 10): Match[] {
    let result = []

    if (findings.count == 0)
        return result

    if (!findings.rangeData)
        throw new Error("Can't get matches without range data!")

    // Helper function to create matches. This avoids a `if` in the loop below
    let constructMatch = (findings, i, precontext, postcontext) => new Match(findings.rangeData[i], findings.rectData[i], precontext, postcontext)
    if (!findings.rectData)
        constructMatch = (findings, i, precontext, postcontext) => new Match(findings.rangeData[i], null, precontext, postcontext)

    // Checks if a node belongs to the command line
    let nodes = getNodes();

    for (let i = 0; i < findings.count; ++i) {
        let range = findings.rangeData[i]
        let firstnode = nodes[range.startTextNodePos];
        let lastnode = nodes[range.endTextNodePos];
        // We never want to match against nodes in the command line
        if (!firstnode || !lastnode || isCommandLineNode(firstnode) || isCommandLineNode(lastnode)) {
            console.log(i, nodes, range, firstnode, lastnode)
            continue
        }

        // Get the context before the match
        let precontext = firstnode.textContent.substring(range.startOffset - contextLength, range.startOffset)
        if (precontext.length < contextLength) {
            let missingChars = contextLength - precontext.length
            let id = range.startTextNodePos - 1
            while (missingChars > 0 && nodes[id]) {
                let txt = nodes[id].textContent
                precontext = txt.substring(txt.length - missingChars, txt.length) + precontext
                missingChars = contextLength - precontext.length
                id -= 1
            }
        }

        // Get the context after the match
        let postcontext = lastnode.textContent.substr(range.endOffset, contextLength)
        // If the last node doesn't have enough context and if there's a node after it
        if (postcontext.length < contextLength && nodes[range.endTextNodePos + 1]) {
            // Add text from the following text node to the context
            postcontext += nodes[range.endTextNodePos + 1].textContent.substr(0, contextLength - postcontext.length)
        }
        
        result.push(constructMatch(findings, i, precontext, postcontext));
    }

    return result;
}

import * as SELF from "./finding_content"
Messaging.addListener("finding_content", Messaging.attributeCaller(SELF))

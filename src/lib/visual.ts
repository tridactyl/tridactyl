// Taken from Lydell's Link Hints addon:
// https://github.com/lydell/LinkHints/blob/4e7ec695b15e1cda474ed4271b8c7c054aacf207/src/worker/Program.js#L1005-L1039
export function reverseSelection(selection: Selection) {
    const direction = getSelectionDirection(selection)

    if (direction == null) {
        return
    }

    const range = selection.getRangeAt(0)
    const [edgeNode, edgeOffset] = direction
        ? [range.startContainer, range.startOffset]
        : [range.endContainer, range.endOffset]

    range.collapse(!direction)
    selection.removeAllRanges()
    selection.addRange(range)
    selection.extend(edgeNode, edgeOffset)
}

// true → forward, false → backward, undefined → unknown
function getSelectionDirection(selection: Selection): boolean {
    if (selection.isCollapsed) {
        return undefined
    }

    const { anchorNode, focusNode } = selection

    if (anchorNode == null || focusNode == null) {
        return undefined
    }

    const range = document.createRange()
    range.setStart(anchorNode, selection.anchorOffset)
    range.setEnd(focusNode, selection.focusOffset)
    return !range.collapsed
}

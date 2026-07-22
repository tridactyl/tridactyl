import { extendByWord } from "@src/lib/visual"

test("word movement restores the last selection at its boundary", () => {
    const node = document.createTextNode("one two")
    document.body.appendChild(node)
    const selection = getSelection()
    selection.setBaseAndExtent(node, 5, node, 1)
    const focusOffsets = [3, 7, 4, 5]
    let moves = 0
    const modify = jest.fn(() => {
        selection.setBaseAndExtent(node, 5, node, focusOffsets[moves++])
    })
    selection.modify = modify

    extendByWord(selection)

    expect(modify.mock.calls).toEqual([
        ["extend", "forward", "word"],
        ["extend", "forward", "word"],
        ["extend", "backward", "word"],
        ["extend", "forward", "character"],
    ])
    expect(selection.isCollapsed).toBe(false)
    expect(selection.anchorOffset).toBe(5)
    expect(selection.focusOffset).toBe(4)
})

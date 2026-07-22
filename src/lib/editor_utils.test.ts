import { beginning_of_line } from "@src/lib/editor"

test("beginning_of_line does not expose an intermediate selection", () => {
    const input = document.createElement("input")
    input.value = "query"
    input.setSelectionRange(5, 5)

    const selectionStart = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "selectionStart",
    )
    const observedSelections = []
    Object.defineProperty(input, "selectionStart", {
        get: selectionStart.get,
        set(value) {
            selectionStart.set.call(this, value)
            observedSelections.push([this.selectionStart, this.selectionEnd])
        },
    })

    beginning_of_line(input)

    expect(observedSelections).not.toContainEqual([0, 5])
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, 0])
})

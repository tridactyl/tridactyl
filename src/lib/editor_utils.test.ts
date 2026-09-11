import {
    backward_kill_word,
    beginning_of_line,
    unix_word_rubout,
} from "@src/lib/editor"

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

test("unix_word_rubout uses letter boundaries", () => {
    const rubout = (value: string, start = value.length, end = start) => {
        const input = document.createElement("input")
        input.value = value
        input.setSelectionRange(start, end)
        unix_word_rubout(input)
        return [input.value, input.selectionStart, input.selectionEnd]
    }

    expect(rubout("some-text-here")).toEqual(["some-text-", 10, 10])
    expect(rubout("some-text-here  ")).toEqual(["some-text-", 10, 10])
    expect(rubout("---")).toEqual(["", 0, 0])
    expect(rubout("   ")).toEqual(["", 0, 0])
    expect(rubout("some-text-here", 5, 9)).toEqual(["some--here", 5, 5])
    expect(rubout("some-text-here", 0)).toEqual(["some-text-here", 0, 0])

    const input = document.createElement("input")
    input.value = "some-text-here"
    input.setSelectionRange(input.value.length, input.value.length)
    backward_kill_word(input)
    expect(input.value).toBe("")
})

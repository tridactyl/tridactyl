import { getSelector } from "@src/lib/dom"

test("getSelector handles numeric ancestor IDs", () => {
    document.body.innerHTML = '<div id="40796595"><textarea></textarea></div>'
    const textarea = document.querySelector("textarea")

    expect(document.querySelector(getSelector(textarea))).toBe(textarea)
})

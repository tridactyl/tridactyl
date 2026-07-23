import { getSelector, isTextEditable, setupFocusHandler } from "@src/lib/dom"

test("getSelector handles numeric ancestor IDs", () => {
    document.body.innerHTML = '<div id="40796595"><textarea></textarea></div>'
    const textarea = document.querySelector("textarea")

    expect(document.querySelector(getSelector(textarea))).toBe(textarea)
})

test.each([
    ["<div id=x role=combobox>", true],
    ["<div role=listbox><span id=x>", true],
    ["<button id=x aria-haspopup=listbox>", true],
    ['<div id=x class="ui selection dropdown" tabindex=0>', true],
    ["<div id=x>", false],
    ["<button id=x aria-haspopup=menu>", false],
    ["<div role=combobox aria-disabled=true><input id=x>", false],
    ["<div role=listbox><div id=x role=option aria-disabled=true>", true],
    ['<div id=x role="menu combobox">', false],
    ['<div id=x class="ui selection dropdown disabled" tabindex=0>', false],
])("isTextEditable handles keyboard-select controls: %s", (html, expected) => {
    document.body.innerHTML = html
    expect(isTextEditable(document.querySelector("#x"))).toBe(expected)
})

test("setupFocusHandler reports focus leaving and returning to an editable element", async () => {
    jest.mocked(browser.tabs.query).mockResolvedValue([
        { id: 1 } as browser.tabs.Tab,
    ])
    jest.mocked(browser.runtime.sendMessage).mockResolvedValue([])
    document.body.innerHTML = "<textarea></textarea><button></button>"
    const listener = jest.fn()
    setupFocusHandler(document, listener)
    listener.mockClear()

    const textarea = document.querySelector("textarea")
    textarea.focus()
    textarea.blur()
    await new Promise(resolve => setTimeout(resolve))
    expect(listener).toHaveBeenCalledTimes(2)

    listener.mockClear()
    textarea.focus()
    document.querySelector("button").focus()
    await new Promise(resolve => setTimeout(resolve))
    expect(listener).toHaveBeenCalledTimes(2)
})

jest.mocked(browser.runtime.sendMessage)
    .mockResolvedValueOnce("false")
    .mockResolvedValueOnce("true")

const flush = () => new Promise(resolve => setTimeout(resolve))

test("popup separates toggling from reloading the active tab", async () => {
    document.body.innerHTML = `
        <p id="state"></p>
        <button id="toggle" disabled></button>
        <button id="reload" disabled></button>`
    jest.mocked(browser.tabs.query).mockResolvedValue([
        { id: 7 } as browser.tabs.Tab,
    ])
    jest.mocked(browser.tabs.reload).mockResolvedValue(undefined)
    const close = jest.spyOn(window, "close").mockImplementation()

    await import("@src/browser_action_popup")
    await flush()
    expect(document.querySelector("#state").textContent).toBe(
        "Enabled globally",
    )
    expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
        type: "browser_action_background",
        command: "getState",
        args: [],
    })

    document.querySelector<HTMLElement>("#toggle").click()
    expect(document.querySelector<HTMLButtonElement>("#reload").disabled).toBe(
        true,
    )
    await flush()
    expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
        type: "browser_action_background",
        command: "toggle",
        args: [],
    })
    expect(browser.tabs.reload).not.toHaveBeenCalled()
    expect(document.querySelector("#state").textContent).toBe(
        "Disabled globally",
    )

    document.querySelector<HTMLElement>("#reload").click()
    expect(document.querySelector<HTMLButtonElement>("#toggle").disabled).toBe(
        true,
    )
    await flush()
    expect(browser.tabs.query).toHaveBeenCalledWith({
        active: true,
        currentWindow: true,
    })
    expect(browser.tabs.reload).toHaveBeenCalledWith(7)
    expect(close).toHaveBeenCalled()
})

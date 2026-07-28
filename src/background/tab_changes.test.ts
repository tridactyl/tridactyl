import { messageTabChanges } from "@src/background/tab_changes"
test("tab change bursts are delivered in order without overlap", async () => {
    jest.useFakeTimers()
    let finishSending
    const send = jest.mocked(browser.runtime.sendMessage)
    const firstSend = new Promise<void>(resolve => (finishSending = resolve))
    send.mockReturnValueOnce(firstSend).mockResolvedValue(undefined)
    for (let id = 0; id < 1500; id++) messageTabChanges("tab_created")
    jest.runOnlyPendingTimers()
    await Promise.resolve()
    expect(send.mock.calls[0][0]).toEqual({
        type: "tab_changes",
        command: "priority",
    })
    messageTabChanges("tab_updated")
    expect(send).toHaveBeenCalledTimes(1)
    finishSending()
    await Promise.resolve().then(() => undefined)
    expect(send.mock.calls[1][0]).toEqual({
        type: "tab_changes",
        command: "updated",
    })
    jest.useRealTimers()
})

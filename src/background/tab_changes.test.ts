import { messageTabChanges } from "@src/background/tab_changes"
test("tab change bursts are delivered in order without overlap", async () => {
    jest.useFakeTimers()
    let finishSending
    const query = jest.mocked(browser.tabs.query)
    const send = jest.mocked(browser.tabs.sendMessage)
    query.mockResolvedValue([{ id: 1 }, { id: 2 }] as browser.tabs.Tab[])
    const firstSend = new Promise<void>(resolve => (finishSending = resolve))
    send.mockReturnValueOnce(firstSend).mockResolvedValue(undefined)
    const waitForSends = async (count: number) => {
        for (let i = 0; i < 10 && send.mock.calls.length < count; i++)
            await Promise.resolve()
    }
    for (let id = 0; id < 1500; id++) messageTabChanges("tab_created")
    jest.runOnlyPendingTimers()
    await waitForSends(2)
    expect(query).toHaveBeenCalledWith({ active: true })
    expect(send.mock.calls.slice(0, 2)).toEqual(
        [1, 2].map(id => [id, { type: "tab_changes", command: "priority" }]),
    )
    messageTabChanges("tab_updated")
    expect(send).toHaveBeenCalledTimes(2)
    finishSending()
    await waitForSends(4)
    expect(send.mock.calls.slice(2)).toEqual(
        [1, 2].map(id => [id, { type: "tab_changes", command: "updated" }]),
    )
    jest.useRealTimers()
})

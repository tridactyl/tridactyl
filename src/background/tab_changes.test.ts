import { messageTabChanges } from "@src/background/tab_changes"
test("tab change bursts are delivered in order without overlap", async () => {
    jest.useFakeTimers()
    let finishSending
    const send = jest.mocked(browser.runtime.sendMessage)
    const firstSend = new Promise<void>(resolve => (finishSending = resolve))
    send.mockReturnValueOnce(firstSend).mockResolvedValue(undefined)
    const changes: [string, any[]][] = []
    for (let id = 0; id < 1500; id++) changes.push(["tab_created", [{ id }]])
    changes.forEach(change => messageTabChanges(...change))
    jest.runOnlyPendingTimers()
    await Promise.resolve()
    expect((send.mock.calls[0][0] as any).args[0]).toEqual(changes)
    const update: [string, any[]] = ["tab_updated", [1499, {}, {}]]
    messageTabChanges(...update)
    expect(send).toHaveBeenCalledTimes(1)
    finishSending()
    await Promise.resolve().then(() => undefined)
    expect((send.mock.calls[1][0] as any).args[0]).toEqual([update])
    jest.useRealTimers()
})

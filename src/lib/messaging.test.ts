import { attributeCaller, message, setupListener } from "./messaging"
import { unwrapMessageResponse } from "./message_response"

test("background messages use callback responses", async () => {
    const addListener = browser.runtime.onMessage.addListener as jest.Mock
    const run = jest.fn().mockResolvedValue("result")
    const sendResponse = jest.fn()
    addListener.mockClear()

    setupListener({ rpc: { run } })
    const listener = addListener.mock.calls[0][0]
    expect(
        listener(
            { type: "rpc", command: "run", args: ["argument"] },
            {},
            sendResponse,
        ),
    ).toBe(true)
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(run).toHaveBeenCalledWith("argument")
    expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({ value: "result" }),
    )
    ;(browser.runtime.sendMessage as jest.Mock).mockResolvedValue(
        sendResponse.mock.calls[0][0],
    )
    await expect((message as any)("rpc", "run", "argument")).resolves.toBe(
        "result",
    )
})

test("tab messages resolve asynchronous responses and errors", async () => {
    const sendResponse = jest.fn()
    const handler = attributeCaller({
        succeed: async () => "result",
        fail: async () => {
            throw new TypeError("failure")
        },
    })

    expect(
        handler({ type: "excmd_content", command: "succeed" } as any, {}, sendResponse),
    ).toBe(true)
    await new Promise(resolve => setTimeout(resolve, 0))
    await expect(
        unwrapMessageResponse(Promise.resolve(sendResponse.mock.calls[0][0])),
    ).resolves.toBe("result")

    sendResponse.mockClear()
    expect(
        handler({ type: "excmd_content", command: "fail" } as any, {}, sendResponse),
    ).toBe(true)
    await new Promise(resolve => setTimeout(resolve, 0))
    await expect(
        unwrapMessageResponse(Promise.resolve(sendResponse.mock.calls[0][0])),
    ).rejects.toThrow("failure")
})

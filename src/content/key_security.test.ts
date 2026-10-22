import * as Messaging from "@src/lib/messaging"
import { guarded, isTrustedKeyboardEvent } from "@src/lib/keyseq"
import {
    acceptKey,
    canceller,
    generator,
    startBufferingPageKeys,
} from "@src/content/controller_content"

jest.mock("@src/lib/messaging", () => ({
    ...jest.requireActual("@src/lib/messaging"),
    addListener: jest.fn(),
}))

function bufferedKeys() {
    const listener = jest
        .mocked(Messaging.addListener)
        .mock.calls.find(([name]) => name === "stop_buffering_page_keys")[1]
    const reply = jest.fn()
    listener({ type: "stop_buffering_page_keys" }, {}, reply)
    return reply.mock.calls[0][0]
}

test.each([
    ["keydown", "x"],
    ["keydown", "Escape"],
    ["keydown", "Enter"],
    ["keypress", "x"],
    ["keyup", "x"],
])("reject synthetic %s %s before buffering or parsing", async (type, key) => {
    const next = jest.spyOn(generator, "next")
    const cancel = jest.spyOn(canceller, "push")
    const event = new KeyboardEvent(type, {
        key,
        code: "KeyX",
        cancelable: true,
    })
    startBufferingPageKeys()
    try {
        guarded(acceptKey)(event)
        expect(event.defaultPrevented).toBe(false)
        expect(cancel).not.toHaveBeenCalled()
        expect(next).not.toHaveBeenCalled()
        await expect(bufferedKeys()).resolves.toEqual([])
    } finally {
        await bufferedKeys()
        jest.restoreAllMocks()
    }
})

test.each<[string, () => unknown]>([
    ["plain object", () => ({ isTrusted: true, type: "keydown", key: "x" })],
    [
        "hostile getter",
        () =>
            new Proxy(
                {},
                {
                    get() {
                        throw new Error("hostile getter")
                    },
                },
            ),
    ],
    ["null", () => null],
    ["undefined", () => undefined],
])("keyboard trust check rejects %s", (_label, makeEvent) => {
    expect(isTrustedKeyboardEvent(makeEvent())).toBe(false)
})

import { acceptTrustedKey, canceller } from "@src/content/controller_content"
import { guarded, TrustedKeyboardEvent } from "@src/lib/keyseq"

function keyEvent(target: HTMLElement, type: string) {
    const event = new KeyboardEvent(type, { cancelable: true, code: "KeyX" })
    target.dispatchEvent(event)
    return event as TrustedKeyboardEvent
}

test.each(["keydown", "keyup"])(
    "synthetic %s events do not reach the key parser",
    eventType => {
        const accept = jest.fn()
        const event = new KeyboardEvent(eventType, { key: "j" })

        expect(event.isTrusted).toBe(false)

        const guardedAcceptKey = guarded(accept)
        expect(guarded(accept)).toBe(guardedAcceptKey)
        guardedAcceptKey(event)
        acceptTrustedKey(event, accept)

        expect(accept).not.toHaveBeenCalled()
    },
)

test("keyup cancellation survives a focus change", () => {
    const before = document.createElement("input")
    const after = document.createElement("input")
    canceller.push(keyEvent(before, "keydown"))

    const keypress = keyEvent(after, "keypress")
    canceller.cancelKeyPress(keypress)
    expect(keypress.defaultPrevented).toBe(false)

    const keyup = keyEvent(after, "keyup")
    canceller.cancelKeyUp(keyup)
    expect(keyup.defaultPrevented).toBe(true)

    const staleKeypress = keyEvent(before, "keypress")
    canceller.cancelKeyPress(staleKeypress)
    expect(staleKeypress.defaultPrevented).toBe(false)
})

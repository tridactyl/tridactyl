import { acceptTrustedKey } from "@src/content/controller_content"
import { guarded } from "@src/lib/keyseq"

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

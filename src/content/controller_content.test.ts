import { acceptTrustedKey } from "@src/content/controller_content"

test.each(["keydown", "keyup"])(
    "synthetic %s events do not reach the key parser",
    eventType => {
        const accept = jest.fn()
        const event = new KeyboardEvent(eventType, { key: "j" })

        expect(event.isTrusted).toBe(false)

        acceptTrustedKey(event, accept)

        expect(accept).not.toHaveBeenCalled()
    },
)

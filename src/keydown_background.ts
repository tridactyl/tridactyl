// Interface: onKeydown.addListener(func)

// Type for messages sent from keydown_content
interface KeydownShimMessage {
    command: string
    event: Event
}

type KeydownCallback = (keyevent: Event) => void

const listeners = new Set<KeydownCallback>()
function addListener(cb: KeydownCallback) {
    listeners.add(cb)
    return () => { listeners.delete(cb) }
}

export const onKeydown = { addListener }

// Receive events from content and pass to listeners
function handler(message: KeydownShimMessage) {
    if (message.command === "keydown") {
        for (let listener of listeners) {
            listener(message.event)
        }
    }
    // This is req. to shut typescript up.
    // TODO: Fix onMessageBool in web-ext-types
    return false
}

browser.runtime.onMessage.addListener(handler)

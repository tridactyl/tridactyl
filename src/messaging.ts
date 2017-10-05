const listeners = new Map<string, Set<any>>()

/** Register a listener to be called for each message with type */
export function addListener(type, callback) {
    if (!listeners.get(type)) {
        listeners.set(type, new Set())
    }
    listeners.get(type).add(callback)
    return () => { listeners.get(type).delete(callback) }
}

function onMessage(message) {
    if (listeners.get(message.type)) {
        for (let listener of listeners.get(message.type)) {
            listener(message)
        }
    }
}

browser.runtime.onMessage.addListener(onMessage)

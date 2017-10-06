// Interface: onKeydown.addListener(func)

import {MsgSafeKeyboardEvent} from './msgsafe'

// Type for messages sent from keydown_content
export interface KeydownShimMessage extends Message {
    type: "keydown"
    event: MsgSafeKeyboardEvent
}

type KeydownCallback = (keyevent: MsgSafeKeyboardEvent) => void

const listeners = new Set<KeydownCallback>()
function addListener(cb: KeydownCallback) {
    listeners.add(cb)
    return () => { listeners.delete(cb) }
}

export const onKeydown = { addListener }

// Receive events from content and pass to listeners
function handler(message: KeydownShimMessage) {
    if (message.type === "keydown") {
        for (let listener of listeners) {
            listener(message.event)
        }
    }
    // This is req. to shut typescript up.
    // TODO: Fix onMessageBool in web-ext-types
    return false
}

browser.runtime.onMessage.addListener(handler)

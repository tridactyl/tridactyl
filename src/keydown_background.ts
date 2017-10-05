// Interface: onKeydown.addListener(func)
//
import * as Messaging from './messaging'

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
    for (let listener of listeners) {
        listener(message.event)
    }
}

Messaging.addListener('keydown', handler)

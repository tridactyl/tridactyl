// Interface: onKeydown.addListener(func)
//
import * as Messaging from './messaging'

import {MsgSafeKeyboardEvent} from './msgsafe'

type KeydownCallback = (keyevent: MsgSafeKeyboardEvent) => void

const listeners = new Set<KeydownCallback>()
function addListener(cb: KeydownCallback) {
    listeners.add(cb)
    return () => { listeners.delete(cb) }
}

export const onKeydown = { addListener }

// Receive events from content and pass to listeners
export function recvEvent(event: MsgSafeKeyboardEvent) {
    for (let listener of listeners) {
        listener(event)
    }
}

// Get messages from content
import * as SELF from './keydown_background'
Messaging.addListener('keydown_background', Messaging.attributeCaller(SELF))

/** Shim for the keyboard API because it won't hit in FF57. */

import * as msgsafe from './msgsafe'

function keyeventHandler(ke: KeyboardEvent) {
    // Suppress events, if requested
    if (preventDefault) {
        ke.preventDefault()
    }
    if (stopPropagation) {
        ke.stopPropagation()
    }
    browser.runtime.sendMessage({type: "keydown", event: msgsafe.KeyboardEvent(ke)})
}

// Listen for suppression messages from bg script.
function backgroundListener(message: Message) {
    if (message.type === "keydown_suppress") {
        if ('preventDefault' in message.data) {
            preventDefault = message.data.preventDefault
        }
        if ('stopPropagation' in message.data) {
            stopPropagation = message.data.stopPropagation
        }
    }
}

// State
let preventDefault = false
let stopPropagation = false

// Add listeners
window.addEventListener("keydown", keyeventHandler)
browser.runtime.onMessage.addListener(backgroundListener) 

// Dummy export so that TS treats this as a module.
export {}

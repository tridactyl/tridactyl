/** Shim for the keyboard API because it won't hit in FF57. */

import * as Messaging from './messaging'
import * as msgsafe from './msgsafe'
import {isTextEditable} from './dom'
import {isSimpleKey} from './keyseq'

function keyeventHandler(ke: KeyboardEvent) {
    // Ignore JS-generated events for security reasons.
    if (! ke.isTrusted) return

    // Bad workaround: never suppress events in an editable field
    // and never suppress keys pressed with modifiers
    if (state.mode === 'input' || ! (isTextEditable(ke.target as Node) || ke.ctrlKey || ke.altKey)) {
        suppressKey(ke)
    }

    Messaging.message("keydown_background", "recvEvent", [msgsafe.KeyboardEvent(ke)])
}

/** Choose to suppress a key or not */
function suppressKey(ke: KeyboardEvent) {
    // Mode specific suppression
    TerribleModeSpecificSuppression(ke)
}

// {{{ Shitty key suppression workaround.

import state from './state'

// Keys not to suppress in normal mode.
const normalmodewhitelist = [
    '/',
    "'",
    ' ',
]

const hintmodewhitelist = [
    'F3',
    'F5',
    'F12',
]

function TerribleModeSpecificSuppression(ke: KeyboardEvent) {
    switch (state.mode) {
        case "normal":
            // StartsWith happens to work for our maps so far. Obviously won't in the future.
            /* if (Object.getOwnPropertyNames(nmaps).find((map) => map.startsWith(ke.key))) { */

            if (isSimpleKey(ke) && ! normalmodewhitelist.includes(ke.key)) {
                ke.preventDefault()
                ke.stopImmediatePropagation()
            }
            break
        // Hintmode can't clean up after itself yet, so it needs to block more FF shortcuts.
        case "hint":
            if (! hintmodewhitelist.includes(ke.key)) {
                ke.preventDefault()
                ke.stopImmediatePropagation()
            }
            break;
        case "gobble":
            if (isSimpleKey(ke) || ke.key === "Escape") {
                ke.preventDefault()
                ke.stopImmediatePropagation()
            }
            break
        case "input":
            if (ke.key === "Tab") {
                ke.preventDefault()
                ke.stopImmediatePropagation()
            }
            break
        case "ignore":
            break;
        case "insert":
            break;
    }
}

// }}}

// Add listeners
window.addEventListener("keydown", keyeventHandler, true)
import * as SELF from './keydown_content'
Messaging.addListener('keydown_content', Messaging.attributeCaller(SELF))

// Dummy export so that TS treats this as a module.
export {}

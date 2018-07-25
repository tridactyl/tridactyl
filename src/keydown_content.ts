/** Shim for the keyboard API because it won't hit in FF57. */

import * as Messaging from "./messaging"
import * as msgsafe from "./msgsafe"
import { isTextEditable, getAllDocumentFrames } from "./dom"
import { isSimpleKey } from "./keyseq"

function keyeventHandler(ke: KeyboardEvent) {
    // Ignore JS-generated events for security reasons.
    if (!ke.isTrusted) return

    // Mode is changed based on ke target in the bg.
    modeSpecificSuppression(ke)

    Messaging.message("keydown_background", "recvEvent", [
        msgsafe.KeyboardEvent(ke),
    ])
}

// {{{ Bad key suppression system

// This is all awful and will go away when we move the parsers and stuff to content properly.

import state from "./state"

import * as generic from "./parsers/genericmode"
let normparser = keys => generic.parser("nmaps", keys)
let keys = []

/** Choose to suppress a key or not */
function modeSpecificSuppression(ke: KeyboardEvent) {
    let mode = state.mode

    // Duplicate of the logic in src/controller
    // Yes, this is not good.
    // Will be fixed in v2, promise.
    if (
        state.mode != "ignore" &&
        state.mode != "hint" &&
        state.mode != "input" &&
        state.mode != "find"
    ) {
        if (isTextEditable(ke.target as Node)) {
            if (state.mode !== "insert") {
                mode = "insert"
            }
        } else if (state.mode === "insert") {
            mode = "normal"
        }
    } else if (mode === "input" && !isTextEditable(ke.target as Node)) {
        mode = "normal"
    }

    switch (mode) {
        case "normal":
            keys.push(ke)
            const response = normparser(keys)

            // Suppress if there's a match.
            if (response.isMatch) {
                ke.preventDefault()
                ke.stopImmediatePropagation()
            }

            // Update keys array.
            keys = response.keys || []
            break
        // Hintmode can't clean up after itself yet, so it needs to block more FF shortcuts.
        case "hint":
        case "find":
            if (isSimpleKey(ke)) {
                ke.preventDefault()
                ke.stopImmediatePropagation()
            }
            break
        case "gobble":
            if (isSimpleKey(ke) || ke.key === "Escape") {
                ke.preventDefault()
                ke.stopImmediatePropagation()
            }
            break
        case "input":
            if (ke.key === "Tab" || (ke.ctrlKey === true && ke.key === "i")) {
                ke.preventDefault()
                ke.stopImmediatePropagation()
            }
            break
        case "ignore":
            break
        case "insert":
            if (ke.ctrlKey === true && ke.key === "i") {
                ke.preventDefault()
                ke.stopImmediatePropagation()
            }
            break
    }
}

// }}}

// Add listeners
window.addEventListener("keydown", keyeventHandler, true)
document.addEventListener("readystatechange", ev =>
    getAllDocumentFrames().map(frame => {
        frame.contentWindow.removeEventListener(
            "keydown",
            keyeventHandler,
            true,
        )
        frame.contentWindow.addEventListener("keydown", keyeventHandler, true)
    }),
)
import * as SELF from "./keydown_content"
Messaging.addListener("keydown_content", Messaging.attributeCaller(SELF))

// Dummy export so that TS treats this as a module.
export {}

/** Shim for the keyboard API because it won't hit in FF57. */

import * as Messaging from './messaging'
import * as msgsafe from './msgsafe'
import {isTextEditable} from './dom'

function keyeventHandler(ke: KeyboardEvent) {
    // Ignore JS-generated events for security reasons.
    if (! ke.isTrusted) return

    // Bad workaround: never suppress events in an editable field
    // and never suppress keys pressed with modifiers
    if (! (isTextEditable(ke.target as Node) || ke.ctrlKey || ke.altKey)) {
        suppressKey(ke)
    }

    Messaging.message("keydown_background", "recvEvent", [msgsafe.KeyboardEvent(ke)])
}


/** Choose to suppress a key or not based on module state */
function suppressKey(ke: KeyboardEvent) {
    // Silly way
    if (preventDefault) ke.preventDefault()
    if (stopPropagation) ke.stopPropagation()

    // Else if in known maps.
    TerribleModeSpecificSuppression(ke)
}

/** Suppressing all keys from page load means scrolling by arrow key doesn't work until page is reloaded with suppression off. IDK why. Maybe a bug? */
export function suppress(pD?: boolean, sP?: boolean) {
    if (pD !== undefined) { preventDefault = pD }
    if (sP !== undefined) { stopPropagation = sP }
    console.log(pD, sP, preventDefault, stopPropagation)
}

/** UNUSED, hardcoded for now */
/* export function mapState(maps) { */
/*     nmaps = maps */
/* } */

// State
let preventDefault = false
let stopPropagation = false

// {{{ Shitty key suppression workaround.

import state from './state'

function TerribleModeSpecificSuppression(ke: KeyboardEvent) {
    switch (state.mode) {
        case "normal":
            // StartsWith happens to work for our maps so far. Obviously won't in the future.
            if (Object.getOwnPropertyNames(nmaps).find((map) => map.startsWith(ke.key))) {
                ke.preventDefault()
                ke.stopPropagation()
            }
            break
        case "hint":
            ke.preventDefault()
            ke.stopImmediatePropagation()
            break;
    }
}

// Normal-mode mappings.
// keystr -> ex_str
// TODO: Move these into a tridactyl-wide state namespace
// TODO: stop stealing keys from "insert mode"
//          r -> refresh page is particularly unhelpful
//  Can't stringify a map -> just use an object
let nmaps = {
    "o": "fillcmdline open",
    "O": "current_url open",
    "w": "fillcmdline winopen",
    "W": "current_url winopen",
    "t": "tabopen",
    //["t": "fillcmdline tabopen", // for now, use mozilla completion
    "]]": "clicknext", 
    "[[": "clicknext prev", 
    "T": "current_url tabopen",
    "yy": "clipboard yank",
    "p": "clipboard open",
    "P": "clipboard tabopen",
    "j": "scrollline 10",
    "k": "scrollline -10",
    "h": "scrollpx -50",
    "l": "scrollpx 50",
    "G": "scrollto 100",
    "gg": "scrollto 0",
    "H": "back",
    "L": "forward",
    "d": "tabclose",
    "u": "undo",
    "r": "reload",
    "R": "reloadhard",
    "gt": "tabnext",
    "gT": "tabprev",
    "gr": "reader",
    ":": "fillcmdline",
    "s": "fillcmdline open google",
    "S": "fillcmdline tabopen google",
    "xx": "something",
    "b": "openbuffer",
    "ZZ": "qall",
    "f": "hint",
    "F": "hint -b",
    "I": "mode ignore",
    // Special keys must be prepended with 🄰
    // ["🄰Backspace", "something"],
}

// Allow config to be changed in settings
// TODO: make this more general
browser.storage.sync.get("nmaps").then(lazyloadconfig)
async function lazyloadconfig(config_obj){
    let nmaps_config = config_obj["nmaps"]
    nmaps_config = (nmaps_config == undefined) ? {} : nmaps_config
    nmaps = Object.assign(nmaps, nmaps_config)
    console.log(nmaps)
}

// }}}

// Add listeners
window.addEventListener("keydown", keyeventHandler, true)
import * as SELF from './keydown_content'
Messaging.addListener('keydown_content', Messaging.attributeCaller(SELF))

// Get current suppression state
async function init() {
    let state = await Messaging.message("keydown_background", "state")
    suppress(...state)
}
init()


// Dummy export so that TS treats this as a module.
export {}

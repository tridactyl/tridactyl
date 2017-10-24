/** Script used in the commandline iframe. Communicates with background. */

import * as Messaging from './messaging'
import * as SELF from './commandline_frame'

let completions = window.document.getElementById("completions") as HTMLElement
let clInput = window.document.getElementById("tridactyl-input") as HTMLInputElement

export let focus = () => clInput.focus()

/* Process the commandline on enter. */
clInput.addEventListener("keydown", function (keyevent) {
    if (keyevent.key === "Enter") {
        process()
    }
    if (keyevent.key === "Escape") {
        /** Bug workaround: clInput cannot be cleared during an "Escape"
         * keydown event, presumably due to Firefox's internal handler for
         * Escape. So clear clInput just after :)
         *
         * TODO: Report this on bugzilla.
        */
        completions.innerHTML = ""
        setTimeout(()=>{clInput.value = ""}, 0)
        browser.runtime.sendMessage({type: "commandline", exStr: "hidecmdline"})
    }
})

/* Send the commandline to the background script and await response. */
function process() {
    console.log(clInput.value)
    browser.runtime.sendMessage({type: "commandline", exStr: "hidecmdline"})
    browser.runtime.sendMessage({type: "commandline", exStr: clInput.value})
    completions.innerHTML = ""
    clInput.value = ""
}

export function fillcmdline(newcommand?: string){
    if (newcommand != "") {
        clInput.value = newcommand + " "
    }
    // Focus is lost for some reason.
    focus()
}

export function changecompletions(newcompletions: string) {
    completions.innerHTML = newcompletions
}

function handler(message) {
    SELF[message.command](...message.args)
}

try {
    Messaging.addListener('commandline_frame', handler)
} catch(e) {
    console.error("WAHWAH", e)
}

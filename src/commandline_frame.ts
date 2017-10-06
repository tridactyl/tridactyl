/** Script used in the commandline iframe. Communicates with background. */

import * as Messaging from './messaging'

let clInput = window.document.getElementById("tridactyl-input") as HTMLInputElement
clInput.focus()

/* Process the commandline on enter. */
clInput.addEventListener("keydown", function (keyevent) {
    if (keyevent.key === "Enter") {
        process()
    }
})

/* Send the commandline to the background script and await response. */
function process() {
    console.log(clInput.value)
    browser.runtime.sendMessage({type: "commandline", exStr: "hidecommandline"})
    browser.runtime.sendMessage({type: "commandline", exStr: clInput.value})
    clInput.value = ""
}

function changecommand(newcommand?: string){
    if (newcommand !== undefined) {
        clInput.value = newcommand
    }
    // Focus is lost for some reason.
    clInput.focus()
}

function handler(message) {
    console.log(message)
    // this[message.command](...message.args)
    changecommand(...message.args)
}

try {
    Messaging.addListener('commandline_frame', handler)
} catch(e) {
    console.error("WAHWAH", e)
}

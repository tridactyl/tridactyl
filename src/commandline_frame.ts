/** Script used in the commandline iframe. Communicates with background. */

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
    // TODO.
    console.log(clInput.value)
    browser.runtime.sendMessage({type: "commandline", exStr: clInput.value})
    clInput.value = ""
}

// Dummy export to ensure this is treated as a module
export {}

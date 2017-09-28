/** Inject an input element into unsuspecting webpages and provide an API for interaction with tridactyl */

/* TODO: 
    CSS
    Friendliest-to-webpage way of injecting commandline bar?
    Security: how to prevent other people's JS from seeing or accessing the bar or its output?
*/

namespace CommandLine {

    let clDiv = window.document.createElement("div")
    let clInput = window.document.createElement("input")
    clInput.id = "tridactyl-commandline"

    /* Process the commandline on enter. */
    clInput.addEventListener("keydown", function (keyevent) {
        if (keyevent.key === "Enter") {
            process()
        }
    })

    clDiv.appendChild(clInput)
    window.document.body.appendChild(clDiv)

    /** Focus the CommandLine input */
    export let focus = clInput.focus

    /** Send the commandline to the background script and await response. */
    function process() {
        // TODO.
        console.log(clInput.value)
        clInput.value = ""
    }

}

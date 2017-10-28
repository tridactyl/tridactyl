/** Inject an input element into unsuspecting webpages and provide an API for interaction with tridactyl */

/* TODO:
    CSS
    Friendliest-to-webpage way of injecting commandline bar?
    Security: how to prevent other people's JS from seeing or accessing the bar or its output?
        - Method here is isolation via iframe
            - Web content can replace the iframe, but can't view or edit its content.
            - see doc/escalating-privilege.md for other approaches.
*/

// inject the commandline iframe into a content page

let cmdline_iframe: HTMLIFrameElement = undefined

function init(){
    if (cmdline_iframe === undefined && window.document.body !== null) {
        try {
            console.log("INIT")
            cmdline_iframe = window.document.createElement("iframe")
            cmdline_iframe.setAttribute("src", browser.extension.getURL("static/commandline.html"))
            hide()
            window.document.body.appendChild(cmdline_iframe)
        } catch (e) {
            console.error("Couldn't initialise cmdline_iframe!", e)
        }
    }
}

// TODO: Propagate awaits back through messaging system or resend
// commandline_frame messages from excmd_content if you want to avoid init'ing
// every time.
document.addEventListener("DOMContentLoaded", init)
// This second call will fail in the most common case, but makes web-ext reloads effective.
init()

// The CSS in this file should probably go in static/
export function show(){
    // I don't understand how CSS works - but this ensures that the commandline is always at the bottom of the page.
    cmdline_iframe.setAttribute("style", "position: fixed; bottom: 0; left: 0; z-index: 10000; width: 100%; height: 24px; border: 0; padding: 0; margin: 0;");
    const height = cmdline_iframe.contentWindow.document.body.offsetHeight + 'px'
    cmdline_iframe.setAttribute("style", `position: fixed; bottom: 0; left: 0; z-index: 10000; width: 100%; height: ${height}; border: 0; padding: 0; margin: 0;`);
}

export function resize() {
    const height = cmdline_iframe.contentWindow.document.body.offsetHeight + 'px'
    cmdline_iframe.setAttribute("style", `position: fixed; bottom: 0; left: 0; z-index: 10000; width: 100%; height: ${height}; border: 0; padding: 0; margin: 0;`);
}

export function hide(){
    cmdline_iframe.setAttribute("style", `position: fixed; bottom: 0; left: 0; z-index: 10000; width: 100%; height: 0px; border: 0; padding: 0; margin: 0;`);
}

export function focus(){
    cmdline_iframe.focus()
}

export function blur() {
    cmdline_iframe.blur()
}

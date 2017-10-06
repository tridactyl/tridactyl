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
    cmdline_iframe = window.document.createElement("iframe")
    cmdline_iframe.setAttribute("src", browser.extension.getURL("static/commandline.html"))
    hide()
    window.document.body.appendChild(cmdline_iframe)
}

// TODO: Propagate awaits back through messaging system or resend
// commandline_frame messages from excmd_content if you want to avoid init'ing
// every time.
init()

export function show(){
    // if (cmdline_iframe === undefined) {
    //     init()
    // }
    cmdline_iframe.setAttribute("style", "position: fixed; top: 0; left: 0; z-index: 10000; width: 100%; height: 36px; border: 0; padding: 0; margin: 1;");
}

export function hide(){
    cmdline_iframe.setAttribute("style", "display: none")
}

export function focus(){
    show()
    cmdline_iframe.focus()
}

/** Inject an input element into unsuspecting webpages and provide an API for interaction with tridactyl */

import Logger from "./logging"
const logger = new Logger("messaging")

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

function init() {
    if (cmdline_iframe === undefined) {
        try {
            cmdline_iframe = window.document.createElement("iframe")
            cmdline_iframe.className = "cleanslate"
            cmdline_iframe.setAttribute(
                "src",
                browser.extension.getURL("static/commandline.html"),
            )
            cmdline_iframe.setAttribute("id", "cmdline_iframe")
            hide()
            window.document.documentElement.appendChild(cmdline_iframe)
        } catch (e) {
            logger.error("Couldn't initialise cmdline_iframe!", e)
        }
    }
}

// Load the iframe immediately if the document is already complete (happens if tridactyl is reloaded)
// Else load lazily to avoid upsetting page JS that hates foreign iframes.
if (document.readyState === "complete") {
    init()
} else {
    // Surrender event loop with setTimeout() to page JS in case it's still doing stuff.
    document.addEventListener("DOMContentLoaded", () => setTimeout(init, 0))
}

export function show() {
    const height =
        cmdline_iframe.contentWindow.document.body.offsetHeight + "px"
    cmdline_iframe.setAttribute("style", `height: ${height} !important;`)
}

export function hide() {
    cmdline_iframe.setAttribute("style", "height: 0px !important;")
}

export function focus() {
    cmdline_iframe.focus()
}

export function blur() {
    cmdline_iframe.blur()
}

export function executeWithoutCommandLine(fn) {
    let parent
    if (cmdline_iframe) {
        parent = cmdline_iframe.parentNode
        parent.removeChild(cmdline_iframe)
    }
    let result
    try {
        result = fn()
    } catch (e) {
        console.log(e)
    }
    if (cmdline_iframe) parent.appendChild(cmdline_iframe)
    return result
}

import * as Messaging from "./messaging"
import * as SELF from "./commandline_content"
Messaging.addListener("commandline_content", Messaging.attributeCaller(SELF))

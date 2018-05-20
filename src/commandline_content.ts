/** Inject an input element into unsuspecting webpages and provide an API for interaction with tridactyl */

import Logger from "./logging"
import * as config from "./config"
import { theme } from "./styling"
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
let enabled = false

/** Initialise the cmdline_iframe element unless the window location is included in a value of config/noiframeon */
async function init() {
    let noiframeon = await config.getAsync("noiframeon")
    enabled =
        noiframeon.length == 0 ||
        noiframeon.find(url => window.location.href.includes(url)) === undefined
    if (enabled && cmdline_iframe === undefined) {
        try {
            cmdline_iframe = window.document.createElement("iframe")
            cmdline_iframe.className = "cleanslate"
            cmdline_iframe.setAttribute(
                "src",
                browser.extension.getURL("static/commandline.html"),
            )
            cmdline_iframe.setAttribute("id", "cmdline_iframe")
            hide()
            document.documentElement.appendChild(cmdline_iframe)
            // first theming of page root
            await theme(window.document.querySelector(":root"))
        } catch (e) {
            logger.error("Couldn't initialise cmdline_iframe!", e)
        }
    }
}

// Load the iframe immediately if we can (happens if tridactyl is reloaded or on ImageDocument)
// Else load lazily to avoid upsetting page JS that hates foreign iframes.
try {
    init()
} catch (e) {
    // Surrender event loop with setTimeout() to page JS in case it's still doing stuff.
    document.addEventListener("DOMContentLoaded", () => setTimeout(init, 0))
}

export function show() {
    try {
        const height =
            cmdline_iframe.contentWindow.document.body.offsetHeight + "px"
        cmdline_iframe.setAttribute("style", `height: ${height} !important;`)
    } catch (e) {}
}

export function hide() {
    try {
        cmdline_iframe.setAttribute("style", "height: 0px !important;")
    } catch (e) {}
}

export function focus() {
    try {
        cmdline_iframe.focus()
    } catch (e) {}
}

export function blur() {
    try {
        cmdline_iframe.blur()
    } catch (e) {}
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

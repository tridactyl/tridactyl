/** Inject an input element into unsuspecting webpages and provide an API for interaction with tridactyl */

import Logger from "@src/lib/logging"
import * as config from "@src/lib/config"
import { theme } from "@src/content/styling"
const logger = new Logger("messaging")
const whichkey_logger = new Logger("whichkey")

const whichkey_iframe = window.document.createElementNS(
    "http://www.w3.org/1999/xhtml",
    "iframe",
) as HTMLIFrameElement
whichkey_iframe.className = "cleanslate"
whichkey_iframe.setAttribute(
    "src",
    browser.runtime.getURL("static/whichkey.html"),
)
whichkey_iframe.setAttribute("id", "whichkey_iframe")
whichkey_iframe.setAttribute("loading", "lazy")

let enabled = false

/** Initialise the cmdline_iframe element unless the window location is included in a value of config/noiframe */
async function init() {
    const noiframe = await config.getAsync("noiframe")
    const notridactyl = await config.getAsync("superignore")
    if (noiframe === "false" && notridactyl !== "true" && !enabled) {
        hide()
        document.documentElement.appendChild(whichkey_iframe)
        enabled = true
        // first theming of page root
        await theme(window.document.querySelector(":root"))
    }
}

// Load the iframe immediately if we can (happens if tridactyl is reloaded or on ImageDocument)
// Else load lazily to avoid upsetting page JS that hates foreign iframes.
init().catch(() => {
    // Surrender event loop with setTimeout() to page JS in case it's still doing stuff.
    document.addEventListener("DOMContentLoaded", () =>
        setTimeout(() => {
            init().catch(e =>
                logger.error("Couldn't initialise whichkey_iframe!", e),
            )
        }, 0),
    )
})

export function show(hidehover = false) {
    try {
        /* Hide "hoverlink" pop-up which obscures command line
         *
         * Inspired by VVimpulation: https://github.com/amedama41/vvimpulation/commit/53065d015d1e9a892496619b51be83771f57b3d5
         */

        if (hidehover) {
            const a = window.document.createElement("A")
            ;(a as any).href = ""
            document.body.appendChild(a)
            a.focus({ preventScroll: true })
            document.body.removeChild(a)
        }

        whichkey_iframe.classList.remove("hidden")
        const height =
            whichkey_iframe.contentWindow.document.body.offsetHeight + "px"
        whichkey_iframe.setAttribute("style", `height: ${height} !important;`)
    } catch (e) {
        whichkey_logger.error(e)
    }
}

export function hide() {
    try {
        whichkey_iframe.classList.add("hidden")
        whichkey_iframe.setAttribute("style", "height: 0px !important;")
    } catch (e) {
        whichkey_logger.error(e)
    }
}

import * as Messaging from "@src/lib/messaging"
import * as SELF from "@src/content/whichkey_content"
Messaging.addListener("whichkey_content", Messaging.attributeCaller(SELF))

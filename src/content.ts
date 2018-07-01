/** Content script entry point */

// Be careful: typescript elides imports that appear not to be used if they're
// assigned to a name.  If you want an import just for its side effects, make
// sure you import it like this:
import "./lib/html-tagged-template"
/* import "./keydown_content" */
/* import "./commandline_content" */
/* import "./excmds_content" */
/* import "./hinting" */
import * as Logging from "./logging"
const logger = new Logging.Logger("content")
logger.debug("Tridactyl content script loaded, boss!")

// Add various useful modules to the window for debugging
import * as commandline_content from "./commandline_content"
import * as convert from "./convert"
import * as config from "./config"
import * as dom from "./dom"
import * as excmds from "./.excmds_content.generated"
import * as hinting_content from "./hinting"
import * as finding_content from "./finding"
import * as itertools from "./itertools"
import * as keydown_content from "./keydown_content"
import * as messaging from "./messaging"
import * as msgsafe from "./msgsafe"
import state from "./state"
import * as webext from "./lib/webext"
import Mark from "mark.js"
import * as keyseq from "./keyseq"
import * as native from "./native_background"
import * as styling from "./styling"
;(window as any).tri = Object.assign(Object.create(null), {
    browserBg: webext.browserBg,
    commandline_content,
    convert,
    config,
    dom,
    excmds,
    hinting_content,
    finding_content,
    itertools,
    keydown_content,
    logger,
    Mark,
    keyseq,
    messaging,
    msgsafe,
    state,
    webext,
    l: prom => prom.then(console.log).catch(console.error),
    native,
    styling,
})

// Don't hijack on the newtab page.
if (webext.inContentScript()) {
    try {
        dom.setupFocusHandler()
        dom.hijackPageListenerFunctions()
    } catch (e) {
        logger.warning("Could not hijack due to CSP:", e)
    }
} else {
    logger.warning("No export func")
}

if (
    window.location.protocol === "moz-extension:" &&
    window.location.pathname === "/static/newtab.html"
) {
    config.getAsync("newtab").then(newtab => {
        if (newtab) {
            excmds.open_quiet(newtab)
        } else {
            document.documentElement.style.display = "block"
            document.title = "Tridactyl Top Tips & New Tab Page"
        }
    })
}

// Really bad status indicator
config.getAsync("modeindicator").then(mode => {
    if (mode !== "true") return

    // Do we want container indicators?
    let containerIndicator = config.get("containerindicator")

    // Hide indicator in print mode
    // CSS not explicitly added to the dom doesn't make it to print mode:
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1448507
    let style = document.createElement("style")
    style.type = "text/css"
    style.innerHTML = `@media print {
        .TridactylStatusIndicator {
            display: none !important;
        }
    }`

    let statusIndicator = document.createElement("span")
    const privateMode = browser.extension.inIncognitoContext
        ? "TridactylPrivate"
        : ""
    statusIndicator.className =
        "cleanslate TridactylStatusIndicator " + privateMode

    // Dynamically sets the border container color.
    if (containerIndicator === "true") {
        webext
            .activeTabContainer()
            .then(container => {
                statusIndicator.setAttribute(
                    "style",
                    `border: ${container.colorCode} solid 1.5px !important`,
                )
            })
            .catch(error => {
                logger.debug(error)
            })
    }

    // This listener makes the modeindicator disappear when the mouse goes over it
    statusIndicator.addEventListener("mouseenter", ev => {
        let target = ev.target as any
        let rect = target.getBoundingClientRect()
        target.classList.add("TridactylInvisible")
        let onMouseOut = ev => {
            // If the mouse event happened out of the mode indicator boundaries
            if (
                ev.clientX < rect.x ||
                ev.clientX > rect.x + rect.with ||
                ev.clientY < rect.y ||
                ev.clientY > rect.y + rect.height
            ) {
                target.classList.remove("TridactylInvisible")
                window.removeEventListener("mousemouve", onMouseOut)
            }
        }
        window.addEventListener("mousemove", onMouseOut)
    })
    try {
        // On quick loading pages, the document is already loaded
        statusIndicator.textContent = state.mode || "normal"
        document.body.appendChild(statusIndicator)
        document.head.appendChild(style)
    } catch (e) {
        // But on slower pages we wait for the document to load
        window.addEventListener("DOMContentLoaded", () => {
            statusIndicator.textContent = state.mode || "normal"
            document.body.appendChild(statusIndicator)
            document.head.appendChild(style)
        })
    }

    browser.storage.onChanged.addListener((changes, areaname) => {
        if (areaname === "local" && "state" in changes) {
            let mode = changes.state.newValue.mode
            const privateMode = browser.extension.inIncognitoContext
                ? "TridactylPrivate"
                : ""
            statusIndicator.className =
                "cleanslate TridactylStatusIndicator " + privateMode
            if (
                dom.isTextEditable(document.activeElement) &&
                !["input", "ignore"].includes(mode)
            ) {
                statusIndicator.textContent = "insert"
                // this doesn't work; statusIndicator.style is full of empty string
                // statusIndicator.style.borderColor = "green !important"
                // need to fix loss of focus by click: doesn't do anything here.
            } else if (
                mode === "insert" &&
                !dom.isTextEditable(document.activeElement)
            ) {
                statusIndicator.textContent = "normal"
                // statusIndicator.style.borderColor = "lightgray !important"
            } else {
                statusIndicator.textContent = mode
            }
        }
        if (config.get("modeindicator") !== "true") statusIndicator.remove()
    })
})

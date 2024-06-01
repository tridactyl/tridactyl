/** Background script entry point. */

/* tslint:disable:import-spacing */

import * as proxy_background from "@src/lib/browser_proxy_background"
import * as controller from "@src/lib/controller"
import { omniscient_controller } from "@src/lib/omniscient_controller"
import * as perf from "@src/perf"
import { listenForCounters } from "@src/perf"
import * as messaging from "@src/lib/messaging"
import * as excmds_background from "@src/.excmds_background.generated"
import { CmdlineCmds } from "@src/background/commandline_cmds"
import { EditorCmds } from "@src/background/editor"
import * as convert from "@src/lib/convert"
import * as config from "@src/lib/config"
import * as dom from "@src/lib/dom"
import * as download_background from "@src/background/download_background"
import * as itertools from "@src/lib/itertools"
import * as keyseq from "@src/lib/keyseq"
import * as request from "@src/lib/requests"
import * as native from "@src/lib/native"
import state from "@src/state"
import * as webext from "@src/lib/webext"
import { AutoContain } from "@src/lib/autocontainers"
import * as extension_info from "@src/lib/extension_info"
import * as omnibox from "@src/background/omnibox"
import * as R from "ramda"
import * as webrequests from "@src/background/webrequests"
import * as commands from "@src/background/commands"
import * as meta from "@src/background/meta"
import * as Logging from "@src/lib/logging"
import * as Proxy from "@src/lib/proxy"
import { tabsProxy } from "@src/lib/tabs"
import { pipeline, env } from "@xenova/transformers"
import * as metadata from "@src/.metadata.generated"

env.allowLocalModels = false
//env.backends.onnx.wasm.numThreads = 1 // might need for manifest v3

// Add various useful modules to the window for debugging
;(window as any).tri = Object.assign(Object.create(null), {
    messaging,
    excmds: excmds_background,
    convert,
    config,
    controller,
    dom,
    download_background,
    itertools,
    native,
    keyseq,
    request,
    state,
    webext,
    webrequests,
    l: (prom: Promise<any>) => prom.then(console.log).catch(console.error),
    contentLocation: window.location,
    R,
    perf,
    meta,
    metadata,
    tabs: tabsProxy,
    pipeline,
})

import { HintingCmds } from "@src/background/hinting"
// Set up our controller to execute background-mode excmds. All code
// running from this entry point, which is to say, everything in the
// background script, will use the excmds that we give to the module
// here.
controller.setExCmds({
    "": excmds_background,
    ex: CmdlineCmds,
    text: EditorCmds,
    hint: HintingCmds,
})

// {{{ tri.contentLocation
// When loading the background, use the active tab to know what the current content url is
browser.tabs.query({ currentWindow: true, active: true }).then(t => {
    ;(window as any).tri.contentLocation = new URL(t[0].url)
})
// After that, on every tab change, update the current url
let contentLocationCount = 0
browser.tabs.onActivated.addListener(ev => {
    const myId = contentLocationCount + 1
    contentLocationCount = myId
    browser.tabs.get(ev.tabId).then(t => {
        // Note: we're using contentLocationCount and myId in order to make sure that only the last onActivated event is used in order to set contentLocation
        // This is needed because otherWise the following chain of execution might happen: onActivated1 => onActivated2 => tabs.get2 => tabs.get1
        if (contentLocationCount === myId) {
            ;(window as any).tri.contentLocation = new URL(t.url)
        }
    })
})

browser.proxy.onRequest.addListener(Proxy.onRequestListener, {
    urls: ["<all_urls>"],
})

/**
 * Declare Tab Event Listeners
 */
browser.tabs.onRemoved.addListener(tabId => {
    messaging.messageAllTabs("tab_changes", "tab_close", [tabId])
})
// Fired when a tab is attached to a window, for example because it was moved between windows.
browser.tabs.onAttached.addListener(tabId => {
    messaging.messageAllTabs("tab_changes", "tab_attached", [tabId])
})
// Fired when a tab is created. Note that the tab's URL may not be set at the time this event fired.
browser.tabs.onCreated.addListener(tabId => {
    messaging.messageAllTabs("tab_changes", "tab_created", [tabId])
})
// Fired when a tab is detached from a window, for example because it is being moved between windows.
browser.tabs.onDetached.addListener(tabId => {
    messaging.messageAllTabs("tab_changes", "tab_detached", [tabId])
})
// Fired when a tab is moved within a window.
browser.tabs.onMoved.addListener(tabId => {
    messaging.messageAllTabs("tab_changes", "tab_moved", [tabId])
})

// Update on navigation too (but remember that sometimes people open tabs in the background :) )
browser.webNavigation.onDOMContentLoaded.addListener(() => {
    browser.tabs.query({ currentWindow: true, active: true }).then(t => {
        ;(window as any).tri.contentLocation = new URL(t[0].url)
    })
})

// Prevent Tridactyl from being updated while it is running in the hope of fixing #290
browser.runtime.onUpdateAvailable.addListener(_ => undefined)

const autocmd_logger = new Logging.Logger("autocmds")
browser.runtime.onStartup.addListener(() => {
    config.getAsync("autocmds", "TriStart").then(aucmds => {
        const hosts = Object.keys(aucmds)
        // If there's only one rule and it's "all", no need to check the hostname
        if (hosts.length === 1 && hosts[0] === ".*") {
            autocmd_logger.debug(
                `TriStart matched ${hosts[0]}: ${aucmds[hosts[0]]}`,
            )
            controller.acceptExCmd(aucmds[hosts[0]])
        } else {
            native.run("hostname").then(hostname => {
                for (const host of hosts) {
                    if (new RegExp(host).exec(hostname.content)) {
                        autocmd_logger.debug(
                            `TriStart matched ${host}: ${aucmds[host]}`,
                        )
                        controller.acceptExCmd(aucmds[host])
                    }
                }
            })
        }
    })
})

// Nag people about updates.
// Hope that they're on a tab we can access.
config.getAsync("update", "nag").then(nag => {
    if (nag === true) excmds_background.updatecheck("auto_polite")
})

// }}}

// {{{ AUTOCOMMANDS

// We could use ev.previousTabId here, but that field is empty when a
// tab is closed, and we do want to run "TabLeft" commands when that
// happens. Instead, we assume that the user can only be in one tab at
// a time and the last tab we entered has to be the one we're leaving.
let curTab = null
browser.tabs.onActivated.addListener(ev => {
    const ignore = _ => _
    if (curTab !== null) {
        // messaging.messageTab failing can happen when leaving
        // privileged tabs (e.g. about:addons) or when the tab is
        // being closed.
        messaging
            .messageTab(curTab, "excmd_content", "loadaucmds", ["TabLeft"])
            .catch(ignore)
    }
    curTab = ev.tabId
    messaging
        .messageTab(curTab, "excmd_content", "loadaucmds", ["TabEnter"])
        .catch(ignore)
})

// Valid events listed here: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest#Events
for (const requestEvent of webrequests.requestEvents) {
    config.getAsync("autocmds", requestEvent).then(aucmds => {
        if (!aucmds) return
        const patterns = Object.keys(aucmds)
        patterns.forEach(pattern =>
            webrequests.registerWebRequestAutocmd(
                requestEvent,
                pattern,
                aucmds[pattern],
            ),
        )
    })
}

config.addChangeListener("autocmds", (previous, current) =>
    webrequests.requestEvents.forEach(
        requestEvent =>
            // If there are autocmd(s) for this requestEvent
            current[requestEvent] !== undefined &&
            Object.entries(
                current[requestEvent] as Record<string, string>,
            ).forEach(([pattern, func]) => {
                // R.path returns undefined if any part of the path is missing rather than saying "computer says no"
                const path = R.path([requestEvent, pattern])

                // If this is a new autocmd, register it
                path(current) !== path(previous) &&
                    webrequests.registerWebRequestAutocmd(
                        requestEvent,
                        pattern,
                        func,
                    )
            }),
    ),
)

// }}}

// {{{ AUTOCONTAINERS

extension_info.init()

const aucon = new AutoContain()

// Handle cancelled requests as a result of autocontain.
browser.webRequest.onCompleted.addListener(aucon.completedRequestListener, {
    urls: ["<all_urls>"],
    types: ["main_frame"],
})

browser.webRequest.onErrorOccurred.addListener(aucon.completedRequestListener, {
    urls: ["<all_urls>"],
    types: ["main_frame"],
})

// Contain autocmd.
browser.webRequest.onBeforeRequest.addListener(
    aucon.autoContain,
    { urls: ["<all_urls>"], types: ["main_frame"] },
    ["blocking"],
)

browser.tabs.onCreated.addListener(aucon.tabCreatedListener)

// }}}

// {{{ PERFORMANCE LOGGING

// An object to collect all of our statistics in one place.
const statsLogger: perf.StatsLogger = new perf.StatsLogger()
const messages = {
    excmd_background: excmds_background,
    controller_background: controller,
    performance_background: statsLogger,
    download_background: {
        downloadUrl: download_background.downloadUrl,
        downloadUrlAs: download_background.downloadUrlAs,
    },
    browser_proxy_background: { shim: proxy_background.shim },
    omniscient_background: omniscient_controller,
}
export type Messages = typeof messages

messaging.setupListener(messages)
// Listen for statistics from the background script and store
// them. Set this one up to log directly to the statsLogger instead of
// going through messaging.
const perfObserver = listenForCounters(statsLogger)
window.tri = Object.assign(window.tri || Object.create(null), {
    // Attach the perf observer to the window object, since there
    // appears to be a bug causing performance observers to be GC'd
    // even if they're still the target of a callback.
    perfObserver,
    // Also attach the statsLogger so we can access our stats from the
    // console.
    statsLogger,
})

// }}}

// {{{ OMNIBOX

omnibox.init()

// }}}

setTimeout(config.update, 5000)

commands.updateListener()

// {{{ Obey Mozilla's orders https://github.com/tridactyl/tridactyl/issues/1800

native.unfixamo()

/// }}}

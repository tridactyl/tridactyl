/** Background script entry point. */

import * as BackgroundController from "@src/background/controller_background"
import "@src/lib/browser_proxy_background"

// Add various useful modules to the window for debugging
import * as perf from "@src/perf"
import { listenForCounters } from "@src/perf"
import * as messaging from "@src/lib/messaging"
import * as excmds from "@src/.excmds_background.generated"
import * as commandline_background from "@src/background/commandline_background"
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
;(window as any).tri = Object.assign(Object.create(null), {
    messaging,
    excmds,
    commandline_background,
    convert,
    config,
    dom,
    download_background,
    itertools,
    native,
    keyseq,
    request,
    state,
    webext,
    l: prom => prom.then(console.log).catch(console.error),
    contentLocation: window.location,
    perf,
})

// {{{ tri.contentLocation
// When loading the background, use the active tab to know what the current content url is
browser.tabs.query({ currentWindow: true, active: true }).then(t => {
    ;(window as any).tri.contentLocation = new URL(t[0].url)
})
// After that, on every tab change, update the current url
let contentLocationCount = 0
browser.tabs.onActivated.addListener(ev => {
    let myId = contentLocationCount + 1
    contentLocationCount = myId
    browser.tabs.get(ev.tabId).then(t => {
        // Note: we're using contentLocationCount and myId in order to make sure that only the last onActivated event is used in order to set contentLocation
        // This is needed because otherWise the following chain of execution might happen: onActivated1 => onActivated2 => tabs.get2 => tabs.get1
        if (contentLocationCount == myId) {
            ;(window as any).tri.contentLocation = new URL(t.url)
        }
    })
})
//

// Send commandline to controller
commandline_background.onLine.addListener(BackgroundController.acceptExCmd)

// {{{ Clobber CSP

// This should be removed once https://bugzilla.mozilla.org/show_bug.cgi?id=1267027 is fixed
function addCSPListener() {
    browser.webRequest.onHeadersReceived.addListener(
        request.clobberCSP,
        { urls: ["<all_urls>"], types: ["main_frame"] },
        ["blocking", "responseHeaders"],
    )
}

function removeCSPListener() {
    browser.webRequest.onHeadersReceived.removeListener(request.clobberCSP)
}

config.getAsync("csp").then(csp => csp === "clobber" && addCSPListener())

config.addChangeListener("csp", (old, cur) => {
    if (cur === "clobber") {
        addCSPListener()
    } else {
        removeCSPListener()
    }
})

// }}}

// Prevent Tridactyl from being updated while it is running in the hope of fixing #290
browser.runtime.onUpdateAvailable.addListener(_ => {})

browser.runtime.onStartup.addListener(_ => {
    config.getAsync("autocmds", "TriStart").then(aucmds => {
        let hosts = Object.keys(aucmds)
        // If there's only one rule and it's "all", no need to check the hostname
        if (hosts.length == 1 && hosts[0] == ".*") {
            BackgroundController.acceptExCmd(aucmds[hosts[0]])
        } else {
            native.run("hostname").then(hostname => {
                for (let host of hosts) {
                    if (hostname.content.match(host)) {
                        BackgroundController.acceptExCmd(aucmds[host])
                    }
                }
            })
        }
    })
})

// Nag people about updates.
// Hope that they're on a tab we can access.
config.getAsync("updatenag").then(nag => {
    if (nag === true) excmds.updatecheck(true)
})

// }}}

// {{{ AUTOCOMMANDS
let curTab = null
browser.tabs.onActivated.addListener(ev => {
    let ignore = _ => _
    if (curTab !== null) {
        // messaging.messageTab failing can happen when leaving privileged tabs (e.g. about:addons)
        messaging
            .messageTab(curTab, "excmd_content", "loadaucmds", ["TabLeft"])
            .catch(ignore)
    }
    curTab = ev.tabId
    messaging
        .messageTab(curTab, "excmd_content", "loadaucmds", ["TabEnter"])
        .catch(ignore)
})

// }}}

// {{{ AUTOCONTAINERS

let aucon = new AutoContain()

// Handle cancelled requests as a result of autocontain.
browser.webRequest.onCompleted.addListener(
    details => {
        if (aucon.getCancelledRequest(details.tabId)) {
            aucon.clearCancelledRequests(details.tabId)
        }
    },
    { urls: ["<all_urls"], types: ["main_frame"] },
)

browser.webRequest.onErrorOccurred.addListener(
    details => {
        if (aucon.getCancelledRequest(details.tabId)) {
            aucon.clearCancelledRequests(details.tabId)
        }
    },
    { urls: ["<all_urls>"], types: ["main_frame"] },
)

// Contain autocmd.
browser.webRequest.onBeforeRequest.addListener(
    aucon.autoContain,
    { urls: ["<all_urls>"], types: ["main_frame"] },
    ["blocking"],
)
// }}}

// {{{ PERFORMANCE LOGGING

// An object to collect all of our statistics in one place.
const statsLogger: perf.StatsLogger = new perf.StatsLogger()
messaging.addListener(
    "performance_background",
    messaging.attributeCaller(statsLogger),
)
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

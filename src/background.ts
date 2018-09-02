/** Background script entry point. */

import * as BackgroundController from "./controller_background"
import "./lib/browser_proxy_background"

// Add various useful modules to the window for debugging
import * as messaging from "./messaging"
import * as excmds from "./.excmds_background.generated"
import * as commandline_background from "./commandline_background"
import * as convert from "./convert"
import * as config from "./config"
import * as dom from "./dom"
import * as download_background from "./download_background"
import * as itertools from "./itertools"
import * as keyseq from "./keyseq"
import * as request from "./requests"
import * as native from "./native_background"
import state from "./state"
import * as webext from "./lib/webext"
import { AutoContain } from "./lib/autocontainers"
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
})

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

browser.storage.onChanged.addListener((changes, areaname) => {
    if ("userconfig" in changes) {
        if (changes.userconfig.newValue.csp === "clobber") {
            addCSPListener()
        } else {
            removeCSPListener()
        }
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

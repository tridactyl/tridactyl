/** Background script entry point. */

import * as Controller from "./controller"
import * as keydown_background from "./keydown_background"
import * as CommandLine from "./commandline_background"
import "./lib/browser_proxy_background"

// Send keys to controller
keydown_background.onKeydown.addListener(Controller.acceptKey)
// To eventually be replaced by:
// browser.keyboard.onKeydown.addListener

// Send commandline to controller
CommandLine.onLine.addListener(Controller.acceptExCmd)

// Add various useful modules to the window for debugging
import * as messaging from "./messaging"
import * as excmds from "./.excmds_background.generated"
import * as commandline_background from "./commandline_background"
import * as controller from "./controller"
import * as convert from "./convert"
import * as config from "./config"
import * as dom from "./dom"
import * as hinting_background from "./hinting_background"
import * as download_background from "./download_background"
import * as gobble_mode from "./parsers/gobblemode"
import * as input_mode from "./parsers/inputmode"
import * as itertools from "./itertools"
import * as keyseq from "./keyseq"
import * as request from "./requests"
import * as native from "./native_background"
import * as msgsafe from "./msgsafe"
import state from "./state"
import * as webext from "./lib/webext"
;(window as any).tri = Object.assign(Object.create(null), {
    messaging,
    excmds,
    commandline_background,
    controller,
    convert,
    config,
    dom,
    hinting_background,
    download_background,
    gobble_mode,
    input_mode,
    itertools,
    keydown_background,
    native,
    keyseq,
    request,
    msgsafe,
    state,
    webext,
    l: prom => prom.then(console.log).catch(console.error),
})

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
            Controller.acceptExCmd(aucmds[hosts[0]])
        } else {
            native.run("hostname").then(hostname => {
                for (let host of hosts) {
                    if (hostname.content.match(host)) {
                        Controller.acceptExCmd(aucmds[host])
                    }
                }
            })
        }
    })
})

let curTab = null
browser.tabs.onActivated.addListener(ev => {
    if (curTab !== null)
        messaging.messageTab(curTab, "excmd_content", "loadaucmds", ["TabLeft"])
    curTab = ev.tabId
    messaging.messageTab(curTab, "excmd_content", "loadaucmds", ["TabEnter"])
})

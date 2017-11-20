/** Background script entry point. */

import * as Controller from "./controller"
import * as keydown_background from "./keydown_background"
import * as CommandLine from "./commandline_background"
import './lib/browser_proxy_background'

// Send keys to controller
keydown_background.onKeydown.addListener(Controller.acceptKey)
// To eventually be replaced by:
// browser.keyboard.onKeydown.addListener

// Send commandline to controller
CommandLine.onLine.addListener(Controller.acceptExCmd)

// Add various useful modules to the window for debugging
import * as messaging from './messaging'
import * as excmds from './excmds_background'
import * as commandline_background from './commandline_background'
import * as controller from './controller'
import * as convert from './convert'
import * as dom from './dom'
import * as hinting_background from './hinting_background'
import * as itertools from './itertools'
import * as keyseq from './keyseq'
import * as msgsafe from './msgsafe'
import * as state from './state'
import * as webext from './lib/webext'

(window as any).tri = Object.assign(Object.create(null), {
    messaging,
    excmds,
    commandline_background,
    controller,
    convert,
    dom,
    hinting_background,
    itertools,
    keydown_background,
    keyseq,
    msgsafe,
    state,
    webext,
    l: prom => prom.then(console.log).catch(console.error),
})

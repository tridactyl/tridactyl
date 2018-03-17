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
import * as config from './config'
import * as dom from './dom'
import * as hinting_background from './hinting_background'
import * as download_background from './download_background'
import * as gobble_mode from './parsers/gobblemode'
import * as input_mode from './parsers/inputmode'
import * as itertools from './itertools'
import * as keyseq from './keyseq'
import * as msgsafe from './msgsafe'
import state from './state'
import * as webext from './lib/webext'

(window as any).tri = Object.assign(Object.create(null), {
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
    keyseq,
    msgsafe,
    state,
    webext,
    l: prom => prom.then(console.log).catch(console.error),
})

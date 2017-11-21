/** Content script entry point */

// Be careful: typescript elides imports that appear not to be used if they're
// assigned to a name.  If you want an import just for its side effects, make
// sure you import it like this:
/* import "./keydown_content" */
/* import "./commandline_content" */
/* import "./excmds_content" */
/* import "./hinting" */

console.log("Tridactyl content script loaded, boss!")

// Add various useful modules to the window for debugging
import * as commandline_content from './commandline_content'
import * as convert from './convert'
import * as dom from './dom'
import * as excmds from './excmds_content'
import * as hinting_content from './hinting'
import * as itertools from './itertools'
import * as keydown_content from "./keydown_content"
import * as messaging from './messaging'
import * as msgsafe from './msgsafe'
import state from './state'
import * as webext from './lib/webext'

(window as any).tri = Object.assign(Object.create(null), {
    browserBg: webext.browserBg,
    commandline_content,
    convert,
    dom,
    excmds,
    hinting_content,
    itertools,
    keydown_content,
    messaging,
    msgsafe,
    state,
    webext,
    l: prom => prom.then(console.log).catch(console.error),
})

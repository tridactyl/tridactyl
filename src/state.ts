/** Tridactyl shared state

    Any context with access to browser.storage can safely import this file and
    get a self-updating consistent copy of the shared program state.

    Any context may modify their copy of the state and that modification will
    be propagated to the rest of the program.

    This works by proxying the state object such that setting any property
    causes the entire state to be saved to storage and adding a listener that
    listens for storage events and updates the proxied object on each storage
    event.

    If this turns out to be expensive there are improvements available.
*/

import Logger from "@src/lib/logging"
import * as messaging from "@src/lib/messaging"
import {notBackground} from "@src/lib/webext"

const logger = new Logger("state")

class State {
    lastSearchQuery: string = undefined
    cmdHistory: string[] = []
    prevInputs: Array<{ inputId: string; tab: number; jumppos?: number }> = [
        {
            inputId: undefined,
            tab: undefined,
            jumppos: undefined,
        },
    ]
    last_ex_str: string = "echo"
}

// Don't change these from const or you risk breaking the Proxy below.
const defaults = Object.freeze(new State())

const overlay = {} as State
browser.storage.local
    .get("state")
    .then(res => {
        if ("state" in res) {
            logger.debug("Loaded initial state:", res.state)
            Object.assign(overlay, res.state)
        }
    })
    .catch((...args) => logger.error(...args))

const state = (new Proxy(overlay, {
    /** Give defaults if overlay doesn't have the key */
    get(target, property) {
        // if (notBackground()) throw "State object must be accessed with getAsync in content"
        if (property in target) {
            return target[property]
        } else {
            return defaults[property]
        }
    },

    /** Persist sets to storage "immediately" */
    set(target, property, value) {
        logger.debug("State changed!", property, value)
        target[property] = value
        if (notBackground()) {
            browser.runtime.sendMessage({type: "state", command: "stateUpdate", args: [{state: target}]})
        } else {
            // Do we need a global storage lock?
            browser.storage.local.set({ state: target } as any)
        }
        return true
    },
}))

export async function getAsync(property) {
    if (notBackground()) return browser.runtime.sendMessage({type: "state", command: "stateGet", args: [{prop: property}]})
    else return state[property]
}

// Keep instances of state.ts synchronised with each other
messaging.addListener("state", (message, sender, sendResponse) => {
    if (message.command == "stateUpdate") {
        Object.assign(overlay, message.args[0].state)
    } else if (message.command == "stateGet") {
        sendResponse(state[message.args[0].prop])
    } else throw("Unsupported message to state, type " + message.command)
})

export { state as default }

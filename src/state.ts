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

import Logger from "./logging"
const logger = new Logger("state")

export type ModeName =
    | "normal"
    | "insert"
    | "hint"
    | "ignore"
    | "gobble"
    | "input"
    | "find"

export type StateEvent = "modechange"
// Not adding listeners to state because we don't want it to be synced
// TODO: Find a way to replace "modechange" with StateEvent
let listeners: { modechange: ((string) => any)[] } = { modechange: [] }

class State {
    mode: ModeName = "normal"
    cmdHistory: string[] = []
    prevInputs: { inputId: string; tab: number; jumppos?: number }[] = [
        {
            inputId: undefined,
            tab: undefined,
            jumppos: undefined,
        },
    ]
    addListener(ev: StateEvent, cb: (...any) => any) {
        listeners[ev].push(cb)
    }
    removeListener(ev: StateEvent, cb: (...any) => any) {
        let idx = listeners[ev].indexOf(cb)
        if (idx >= 0) listeners[ev].splice(idx, 1)
    }
    fire(ev: StateEvent, data: any) {
        listeners[ev].forEach(fn => fn(data))
    }
}

// Don't change these from const or you risk breaking the Proxy below.
const defaults = Object.freeze(new State())

const overlay = {} as any
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
    get: function(target, property) {
        if (property in target) {
            return target[property]
        } else {
            return defaults[property]
        }
    },

    /** Persist sets to storage immediately */
    set: function(target, property, value) {
        logger.debug("State changed!", property, value)
        target[property] = value
        browser.storage.local.set({ state: target })
        // This is quite hacky. We had to put fire, addListener and removeListener in State for them to be seen as members of State, but since they operate on global data, we don't need to call them exactly from the object they appear to be bound to
        if (property == "mode") defaults.fire("modechange", value)
        return true
    },
}) as any) as State

browser.storage.onChanged.addListener((changes, areaname) => {
    if (areaname === "local" && "state" in changes) {
        if (changes.state.oldValue.mode !== changes.state.newValue.mode)
            defaults.fire("modechange", changes.state.newValue.mode)
        Object.assign(overlay, changes.state.newValue)
    }
})

export { state as default }

/** WebExt code can be run from three contexts:

    Content script
    Extension page
    Background page
*/
function getContext() {
    if (!("tabs" in browser)) {
        return "content"
    } else if (
        browser.runtime.getURL("_generated_background_page.html") ===
        window.location.href
    ) {
        return "background"
    } else {
        return "extension"
    }
}

const CONTEXT = getContext()

/**
 * Send a message to a tab or background depending on dst.
 */
async function msg({ dst }, group, command, args) {
    let message = { group, command, args }
    if (dst === "bg") {
        if (CONTEXT === "background")
            throw `Background can't send itself messages!\nmessage: "${message}"`
        return browser.runtime.sendMessage(message)
    } else if (dst.tabId) {
        return browser.tabs.sendMessage(dst.tabId, message, {
            frameId: dst.frameId,
        })
    } else {
        throw `Unknown destination: "${dst}"\nmessage: ${message}`
    }
}

/**
 * Rtn a handler that will call functions on obj in response to messages.
 *
 * Called functions have their meta.msg.src value updated. This is important
 * for allowing the dispatcher to know which tab to return messages to if the
 * called function wants to call another dispatched function.
 */
function attributeCaller(obj) {
    return function handler(message, sender) {
        if (Object.keys(obj).includes(message.command)) {
            let meta = message.args[0]
            meta.msg = { src: sender }
            return obj[message.command](...message.args)
        } else {
            return Promise.reject(
                `Command not recognised: "${message.command}"`,
            )
        }
    }
}

type listener = Function
const listeners = new Map<string, Set<listener>>()

/** Register a listener to be called for each message with type */
export function addListener(group, callback: listener) {
    if (!listeners.get(group)) {
        listeners.set(group, new Set())
    }
    listeners.get(group).add(callback)
    return () => {
        listeners.get(group).delete(callback)
    }
}

/** Recv a message from runtime.onMessage and send to all listeners */
function onMessage(message, sender, sendResponse) {
    if (listeners.get(message.group)) {
        for (let listener of listeners.get(message.group)) {
            listener(message, sender, sendResponse)
        }
    }
}

browser.runtime.onMessage.addListener(onMessage)

function funcDec(func) {
    return (proto, name, propDesc) => (propDesc.value = func(propDesc.value))
}

/** Runtime function dispatcher.

    Give any function that you want to be available in both foreground and
    background to one of background, content, or dispatch. Wrapped functions
    must have a name, though this could be changed.

    Import the same source file into content and background.

    At execution time, each decorated function will be returned as-is or
    wrapped with a messaging call to the background/content (on activeTab)
    version of the same script.

    Limitations:

        - Helper functions that should be available on only one side can't be
          expressed.
        - It's a bit clumsy to write:
            `export const foo = d.background(function foo(bar) {`

    Advantages:

        - Modules that involve a lot of communication between bg and content
          will be simpler to read and write.

    @param modName: the name of the module we're dispatching for.
*/
export default class Dispatcher {
    private context
    private ourFuncs = Object.create(null)

    constructor(private modName) {
        this.context = getContext()
        addListener(modName, attributeCaller(this.ourFuncs))
    }

    background = <T extends Function>(func: T): T => {
        return this.dispatch(undefined, func)
    }

    content = <T extends Function>(func: T): T => {
        return this.dispatch(func, undefined)
    }

    // Decorator versions of the above
    bg = funcDec(this.background)

    cn = (proto, name, propDesc) => {
        propDesc.value = this.content(propDesc.value)
    }

    dispatch<T extends Function>(contentFun: T, backgroundFun: T): T {
        if (this.context == "background") {
            if (backgroundFun) {
                this.ourFuncs[backgroundFun.name] = backgroundFun
                return backgroundFun
            } else {
                return this.wrapContent(contentFun)
            }
        } else {
            if (contentFun) {
                this.ourFuncs[contentFun.name] = contentFun
                return contentFun
            } else {
                return this.wrapBackground(backgroundFun)
            }
        }
    }

    /* private wrap(func) { */
    /*     let fn */
    /*     if (this.context == 'background') { */
    /*         fn = (...args) => message(this.type, func.name, args) */
    /*     } else { */
    /*         fn = (...args) => messageActiveTab(this.type, func.name, args) */
    /*     } */
    /*     Object.defineProperty(fn, 'name', {value: func.name}) */
    /*     return fn */
    /* } */

    private wrapBackground(func): any {
        return (...args) => msg({ dst: "bg" }, this.modName, func.name, args)
    }

    private wrapContent(func): any {
        return (meta, ...args) =>
            msg({ dst: meta.msg.src }, this.modName, func.name, [meta, ...args])
    }
}

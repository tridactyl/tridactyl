export type listener = (message: Message, sender?, sendResponse?) => void|any

/** await a promise and console.error and rethrow if it errors

    Errors from promises don't get logged unless you seek them out.
*/
async function l(promise) {
    try {
        return await promise
    } catch (e) {
        console.error(e)
        throw e
    }
}

const listeners = new Map<string, Set<listener>>()

/** Register a listener to be called for each message with type */
export function addListener(type, callback: listener) {
    if (!listeners.get(type)) {
        listeners.set(type, new Set())
    }
    listeners.get(type).add(callback)
    return () => { listeners.get(type).delete(callback) }
}

function onMessage(message, sender, sendResponse) {
    if (listeners.get(message.type)) {
        for (let listener of listeners.get(message.type)) {
            listener(message, sender, sendResponse)
        }
    }
}

// Calls methods on obj that match .command and sends responses back
export function attributeCaller(obj) {
    function handler(message: Message, sender, sendResponse) {
        console.log(message)

        // Args may be undefined, but you can't spread undefined...
        if (message.args === undefined) message.args = []

        // Call command on obj
        let response = obj[message.command](...message.args)

        // Return response to sender
        if (response instanceof Promise) {
            return response
        } else {
            sendResponse(response)
        }
    }
    return handler
}

/** Send a message to non-content scripts */
export async function message(type, command, args?) {
    // One day typescript will be smart enough to back propagate this cast.
    return await l(browser.runtime.sendMessage({type, command, args} as Message))
}

/** The first active tab in the currentWindow.
 *
 * TODO: Highlander theory: Can there ever be more than one?
 *
 */
//#background_helper
async function activeTab() {
    return (await l(browser.tabs.query({active: true, currentWindow: true})))[0]
}

//#background_helper
async function activeTabID() {
    return (await activeTab()).id
}

/** Message the active tab of the currentWindow */
//#background_helper
export async function messageActiveTab(type, command: string, args?: any[]) {
    messageTab(await activeTabID(), type, command, args)
}

export async function messageTab(tabId, type, command, args?) {
    let message: Message = {
        type,
        command,
        args,
    }
    l(browser.tabs.sendMessage(tabId, message))
}

export async function messageAllTabs(type, command: string, args?: any[]) {
    for (let tab of await browser.tabs.query({})) {
        messageTab(tab.id, type, command, args)
    }
}


browser.runtime.onMessage.addListener(onMessage)

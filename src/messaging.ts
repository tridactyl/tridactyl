export type TabMessageType = 
    "excmd_content" |
    "keydown_content" |
    "commandline_content" |
    "commandline_frame" |
    "hinting_content"
export type NonTabMessageType = 
    "keydown_background" |
    "commandline_background"
export type MessageType = TabMessageType | NonTabMessageType

export interface Message {
    type: MessageType
    // and other unknown attributes...
    [key: string]: any
}

export type listener = (message: Message, sender?, sendResponse?) => void|Promise<any>

/** await a promise and console.error and rethrow if it errors

    Errors from promises don't get logged unless you seek them out.

    There's an event for catching these, but it's not implemented in firefox
    yet: https://bugzilla.mozilla.org/show_bug.cgi?id=1269371
*/
async function l(promise) {
    try {
        return await promise
    } catch (e) {
        console.error(e)
        throw e
    }
}


// Calls methods on obj that match .command and sends responses back
export function attributeCaller(obj) {
    function handler(message: Message, sender, sendResponse) {
        console.log(message)

        // Args may be undefined, but you can't spread undefined...
        if (message.args === undefined) message.args = []

        // Call command on obj
        try {
            let response = obj[message.command](...message.args)

            // Return response to sender
            if (response instanceof Promise) {
                return response
            } else {
                sendResponse(response)
            }
        } catch (e) {
            return new Promise((resolve, error)=>error(e))
        }
    }
    return handler
}


/** Send a message to non-content scripts */
export async function message(type: NonTabMessageType, command, args?) {
    // One day typescript will be smart enough to back propagate this cast.
    return l(browser.runtime.sendMessage({type, command, args} as Message))
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
export async function messageActiveTab(type: TabMessageType, command: string, args?: any[]) {
    return messageTab(await activeTabID(), type, command, args)
}

export async function messageTab(tabId, type: TabMessageType, command, args?) {
    let message: Message = {
        type,
        command,
        args,
    }
    return l(browser.tabs.sendMessage(tabId, message))
}

export async function messageAllTabs(type: TabMessageType, command: string, args?: any[]) {
    let responses = []
    for (let tab of await browser.tabs.query({})) {
        try { responses.push(await messageTab(tab.id, type, command, args)) }
        catch (e) { console.error(e) }
    }
    return responses
}


const listeners = new Map<string, Set<listener>>()

/** Register a listener to be called for each message with type */
export function addListener(type: MessageType, callback: listener) {
    if (!listeners.get(type)) {
        listeners.set(type, new Set())
    }
    listeners.get(type).add(callback)
    return () => { listeners.get(type).delete(callback) }
}

/** Recv a message from runtime.onMessage and send to all listeners */
function onMessage(message, sender, sendResponse) {
    if (listeners.get(message.type)) {
        for (let listener of listeners.get(message.type)) {
            listener(message, sender, sendResponse)
        }
    }
}


browser.runtime.onMessage.addListener(onMessage)

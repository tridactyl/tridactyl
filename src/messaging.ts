import { browserBg, activeTabId } from "./lib/webext"
import Logger from "./logging"
const logger = new Logger("messaging")

export type TabMessageType =
    | "excmd_content"
    | "commandline_content"
    | "commandline_frame"
export type NonTabMessageType =
    | "commandline_background"
    | "controller_background"
    | "browser_proxy_background"
    | "download_background"
export type MessageType = TabMessageType | NonTabMessageType

export interface Message {
    type: MessageType
    // and other unknown attributes...
    [key: string]: any
}

export type listener = (
    message: Message,
    sender?,
    sendResponse?,
) => void | Promise<any>

// Calls methods on obj that match .command and sends responses back
export function attributeCaller(obj) {
    function handler(message: Message, sender, sendResponse) {
        logger.debug(message)

        // Args may be undefined, but you can't spread undefined...
        if (message.args === undefined) message.args = []

        // Call command on obj
        try {
            let response = obj[message.command](...message.args)

            // Return response to sender
            if (response instanceof Promise) {
                logger.debug("Returning promise...", response)
                sendResponse(response)
                // Docs say you should be able to return a promise, but that
                // doesn't work.
                /* return response */
            } else if (response !== undefined) {
                logger.debug("Returning synchronously...", response)
                sendResponse(response)
            }
        } catch (e) {
            logger.error(
                `Error processing ${message.command}(${message.args})`,
                e,
            )
            return new Promise((resolve, error) => error(e))
        }
    }
    return handler
}

/** Send a message to non-content scripts */
export async function message(type: NonTabMessageType, command, args?) {
    return browser.runtime.sendMessage({ type, command, args } as Message)
}

/** Message the active tab of the currentWindow */
//#background_helper
export async function messageActiveTab(
    type: TabMessageType,
    command: string,
    args?: any[],
) {
    return messageTab(await activeTabId(), type, command, args)
}

export async function messageTab(tabId, type: TabMessageType, command, args?) {
    let message: Message = {
        type,
        command,
        args,
    }
    return browserBg.tabs.sendMessage(tabId, message)
}

export async function messageAllTabs(
    type: TabMessageType,
    command: string,
    args?: any[],
) {
    let responses = []
    for (let tab of await browserBg.tabs.query({})) {
        try {
            responses.push(await messageTab(tab.id, type, command, args))
        } catch (e) {
            logger.error(e)
        }
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
    return () => {
        listeners.get(type).delete(callback)
    }
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

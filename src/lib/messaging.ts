import { browserBg, activeTabId, ownTabId, getContext } from "@src/lib/webext"

interface Message<Root, Type extends keyof Root, Command extends keyof Root[Type]> {
    type: Type
    command: Command
    args: Parameters<Root[Type][Command]>
}

function backgroundHandler<
    Root,
    Type extends keyof Root,
    Command extends (keyof Root[Type])
    >(root: Root,
      message: Message<Root, Type, Command>,
      sender: browser.runtime.MessageSender,
    ): ReturnType<Root[Type][Command]> {
    return root[message.type][message.command](...message.args)
}

export function setupListener<Root>(root: Root) {
    browser.runtime.onMessage.addListener((message: any, sender: browser.runtime.MessageSender) => {
        if (message.type in root) {
            if (!(message.command in root[message.type]))
                throw new Error(`missing handler in protocol ${message.type} ${message.command}`)
            if (!Array.isArray(message.args))
                throw new Error(`wrong arguments in protocol ${message.type} ${message.command}`)
            return backgroundHandler(root, message, sender)
        }
    });
}

/** Send a message to non-content scripts */
export function message<Root>() {
    return async <Type extends keyof Root, Command extends keyof Root[Type]>(
        type: Type, command: Command, args: Parameters<Root[Type][Command]>) => {
            const message: Message<Root, Type, Command> = {
                type,
                command,
                args,
            }

            return browser.runtime.sendMessage<typeof message, ReturnType<Root[Type][Command]>>(message)
        };
}

/** Message the active tab of the currentWindow */
export function messageActiveTab<Root>() {
    return async <Type extends keyof Root, Command extends keyof Root[Type]>(
        type: Type, command: Command, args: Parameters<Root[Type][Command]>) =>
        messageTab<Root>()(await activeTabId(), type, command, args)
}

export function messageTab<Root>() {
    return async <Type extends keyof Root, Command extends keyof Root[Type]>(tabId: number, type: Type, command: Command, args: Parameters<Root[Type][Command]>) => {
        const message: Message<Root, Type, Command> = {
            type,
            command,
            args,
        }
        return browserBg.tabs.sendMessage(tabId, message) as ReturnType<Root[Type][Command]>
    };
}

let _ownTabId
export function messageOwnTab<Root>() {
    return async <Type extends keyof Root, Command extends keyof Root[Type]>(
        type: Type, command: Command, args: Parameters<Root[Type][Command]>) => {
            if (_ownTabId === undefined) {
                _ownTabId = await ownTabId()
            }
            if (_ownTabId === undefined)
                throw new Error("Can't message own tab: _ownTabId is undefined")
            return messageTab<Root>()(_ownTabId, type, command, args)
        }
}

if (getContext() === "background") {
    // Warning: lib/webext.ts:ownTab() relies on this listener being added in order to work
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type !== "owntab_background")
            return;
        const x = Object.assign(Object.create(null), sender.tab)
        x.mutedInfo = Object.assign(Object.create(null), sender.tab.mutedInfo)
        x.sharingState = Object.assign(
            Object.create(null),
            sender.tab.sharingState,
        )
        sendResponse(Promise.resolve(x))
    })
}

import {messageAllTabs, addListener, Message} from "@src/lib/messaging"

export const OWNED_LOCKS = new Set()

export async function acquire(lockname: string) {
    if (OWNED_LOCKS.has(lockname)) return
    async function getContention() {
        return (await browser.runtime.sendMessage({type: "lock", command: "acquire", args: [lockname]})) ||
        (await messageAllTabs("lock", "acquire", [lockname])).some(x => x === true)
    }

    let contention = await getContention()
    while (contention) {
        await new Promise(resolve => setTimeout(resolve, 100)) // Sleep 100ms
        contention = await getContention()
    }
    OWNED_LOCKS.add(lockname)
}

export async function release(lockname: string) {
    OWNED_LOCKS.delete(lockname)
}

async function lockhandler(msg: Message, sender, sendResponse) {
    if (msg.command == "acquire") {
        const lockname = msg.args[0]
        return sendResponse(OWNED_LOCKS.has(lockname))
    }
    return sendResponse(true)
}

addListener("lock", lockhandler)

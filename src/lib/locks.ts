// This attempts to implement the Ricart-Agrawala algorithm: https://www.wikipedia.org/wiki/Ricart%E2%80%93Agrawala_algorithm
import {messageAllTabs} from "@src/lib/messaging"

import {v1 as uuid} from "uuid"

export const OWNED_LOCKS = new Set()

export const DESIRED_LOCKS = {}

export const ID = uuid()

const now = () => (new Date()).getTime() + Math.random() // getTime is accurate only to ms, so fake microseconds with random

export async function acquire(lockname: string, timeout= 2000) {
    if (OWNED_LOCKS.has(lockname) || DESIRED_LOCKS.hasOwnProperty(lockname)) return;
    const time = now()

    DESIRED_LOCKS[lockname] = time

    await Promise.all([
        browser.runtime.sendMessage({type: "lock", command: "acquire", args: [lockname, time, ID]}),
        messageAllTabs("lock", "acquire", [lockname, time, ID]),
        new Promise(resolve => setTimeout(resolve, timeout)), // Take lock anyway after timeout
    ])

    delete DESIRED_LOCKS[lockname]
    OWNED_LOCKS.add(lockname)
}

export async function release(lockname: string) {
    OWNED_LOCKS.delete(lockname)
}

function lockhandler(msg, sender, sendResponse) {
    if (msg.type !== "lock") return false
    if (msg.command == "acquire") {
        const lockname = msg.args[0]
        const their_niceness = msg.args[1]
        if (ID == msg.args[2]) {return sendResponse("Lock reply: I am you")}
        (async () => {
            while (true) {
                // If we don't have the lock
                if (!OWNED_LOCKS.has(lockname)) {
                    // and don't want it
                    if (!DESIRED_LOCKS.hasOwnProperty(lockname)) {
                        // Let them know they can have it
                        return sendResponse([lockname, now()])
                    }
                    // or they wanted it before we asked for it
                    if (DESIRED_LOCKS[lockname] > their_niceness) {
                        // Let them know they can have it
                        return sendResponse([lockname, now()])
                    }
                }

                // Otherwise wait a bit and then look again
                await new Promise(resolve => setTimeout(resolve, 100)) // Sleep 100ms
            }
        })()
    }
    return true // Tell the browser to wait for sendResponse even though it's async
}

browser.runtime.onMessage.addListener(lockhandler) // Messaging.addListener doesn't allow us to send async responses - is this on purpose?

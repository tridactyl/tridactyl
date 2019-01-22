import { activeTabId } from "@src/lib/webext"
import * as Messaging from "@src/lib/messaging"

export type onLineCallback = (exStr: string) => void

/** CommandLine API for inclusion in background script

  Receives messages from commandline_frame
*/
export const onLine = {
    addListener: function(cb: onLineCallback) {
        listeners.add(cb)
        return () => {
            listeners.delete(cb)
        }
    },
}

const listeners = new Set<onLineCallback>()

/** Receive events from commandline_frame and pass to listeners */
function recvExStr(exstr: string) {
    for (let listener of listeners) {
        listener(exstr)
    }
}

Messaging.addListener(
    "commandline_background",
    Messaging.attributeCaller({
        recvExStr,
    }),
)

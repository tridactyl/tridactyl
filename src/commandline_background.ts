/** CommandLine API for inclusion in background script

  Receives messages from CommandLinePage
*/
export namespace onLine {

    type onLineCallback = (exStr: string) => void

    const listeners = new Set<onLineCallback>()
    export function addListener(cb: onLineCallback) {
        listeners.add(cb)
        return () => { listeners.delete(cb) }
    }

    // Receive events from CommandLinePage and pass to listeners
    function handler(message: any) {
        if (message.command === "commandline") {
            for (let listener of listeners) {
                listener(message.exStr)
            }
        }
        // This is req. to shut typescript up.
        // TODO: Fix onMessageBool in web-ext-types
        return false
    }

    browser.runtime.onMessage.addListener(handler)
}

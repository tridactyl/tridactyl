import { messageOwnTab, setupListener } from "@src/lib/messaging.ts"
import * as DOM from "@src/lib/dom"
import * as _EditorCmds from "@src/lib/editor.ts"
import * as Messages from "@src/message_protocols"

export const EditorCmds = new Proxy(_EditorCmds, {
    get(target, property) {
        if (target[property]) {
            return (...args) => {
                if ((document.activeElement as any).src === browser.runtime.getURL("static/commandline.html")) {
                    return messageOwnTab<Messages.CmdlineFrame>()("commandline_frame", "editor_function", [property, ...args])
                }
                return _EditorCmds[property](DOM.getLastUsedInput(), ...args)
            }
        }
        return target[property]
    }
})

const messages = {
    editorfn_content: EditorCmds
}
export type Messages = typeof messages

setupListener(messages)

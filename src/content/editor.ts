import {
    messageOwnTab,
    addListener,
    attributeCaller,
} from "../lib/messaging"
import * as DOM from "../lib/dom"
import * as _EditorCmds from "../lib/editor"

export const EditorCmds = new Proxy(_EditorCmds, {
    get(target, property) {
        if (target[property]) {
            return (...args) => {
                if (
                    (document.activeElement as any).src ===
                    browser.runtime.getURL("static/commandline.html")
                ) {
                    return messageOwnTab(
                        "commandline_frame",
                        "editor_function",
                        [property].concat(args),
                    )
                }
                return _EditorCmds[property](DOM.getLastUsedInput(), ...args)
            }
        }
        return target[property]
    },
})

addListener("editorfn_content", attributeCaller(EditorCmds))

import { messageActiveTab } from "./messaging"

async function pushKey(key) {
    return await messageActiveTab("hinting_content", "pushKey", [key])
}

async function selectFocusedHint() {
    return await messageActiveTab("hinting_content", "selectFocusedHint")
}

async function reset() {
    return await messageActiveTab("hinting_content", "reset")
}


/** Type for "hint save" actions:
 *    - "link": elements that point to another resource (eg
 *              links to pages/files) - the link target is saved
 *    - "img":  image elements
 */
export type HintSaveType = "link" | "img"

import { MsgSafeKeyboardEvent } from "./msgsafe"

/** At some point, this might be turned into a real keyseq parser

    reset and selectFocusedHints are OK candidates for map targets in the
    future. pushKey less so, I think.

*/
export function parser(keys: MsgSafeKeyboardEvent[]) {
    const key = keys[0].key
    if (key === "Escape") {
        reset()
    } else if (["Enter", " "].includes(key)) {
        selectFocusedHint()
    } else {
        pushKey(keys[0])
    }
    return { keys: [], ex_str: "" }
}

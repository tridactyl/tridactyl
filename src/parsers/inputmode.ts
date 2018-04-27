import state from "../state"
import { MsgSafeKeyboardEvent } from "../msgsafe"

export function init() {
    state.mode = "input"
}

export function parser(keys: MsgSafeKeyboardEvent[]) {
    const key = keys[0].key

    if (key === "Escape") {
        state.mode = "normal"
        return { keys: [], exstr: "unfocus" }
    } else if (key === "Tab") {
        if (keys[0].shiftKey) return { keys: [], exstr: "focusinput -N" }
        else return { keys: [], exstr: "focusinput -n" }
    } else if (key === "e" && keys[0].ctrlKey)
        return { keys: [], exstr: "editor" }
    return { keys: [], exstr: "" }
}

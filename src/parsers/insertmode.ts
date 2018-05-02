import state from "../state"
import { hasModifiers } from "../keyseq"

// Placeholder - should be moved into generic parser
export function parser(keys) {
    const response = { keys: [], exstr: undefined }
    const key = keys[0]

    // state.focusinput being true means that insertmode was entered by using
    // the focusinput command (`gi` by default). When this happens, tab should
    // select the next/previous input according to Tridactyl's algorithm rather
    // than doing whatever it normally does
    if (state.focusinput && key.key === "Tab") {
        if (key.shiftKey) return { keys: [], exstr: "focusinput -N" }
        else return { keys: [], exstr: "focusinput -n" }
    }

    if (!hasModifiers(key)) {
        if (key.key === "Escape") {
            state.mode = "normal"
            return { keys: [], exstr: "unfocus" }
        }
    } else {
        if (key.key === "i" && key.ctrlKey) return { keys: [], exstr: "editor" }
    }
    return { keys: [], exstr: undefined }
}

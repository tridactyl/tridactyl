import { contentState } from "@src/content/state_content"
import { MinimalKey } from "@src/lib/keyseq"

/** Simple container for the gobble state. */
class GobbleState {
    public numKeysOrTerminator: number | string = 0
    public keyCombination = ""
    public endCommand = ""
}

let modeState: GobbleState

/** Init gobble mode. After parsing the defined number of input keys,
 * or until provided terminator key, execute `endCmd` with attached parsed input.
 * `Escape` cancels the mode and returns to normal mode. */
export function init(numKeysOrTerminator: string, endCommand: string) {
    contentState.mode = "gobble"
    modeState = new GobbleState()
    const number = Number(numKeysOrTerminator)
    if (!isNaN(number)) {
        modeState.numKeysOrTerminator = number
    } else modeState.numKeysOrTerminator = numKeysOrTerminator
    modeState.endCommand = endCommand
}

/** Reset state. */
function reset() {
    modeState = undefined
    contentState.mode = "normal"
}

/** Receive keypress. If applicable, execute a command. */
export function parser(keys: MinimalKey[]) {
    function exec() {
        const exstr = modeState.endCommand + " " + modeState.keyCombination
        reset()
        return { keys: [], exstr }
    }

    const key = keys[0].key

    if (key === "Escape") {
        reset()
    } else if (
        typeof modeState.numKeysOrTerminator === "string" &&
        modeState.numKeysOrTerminator === key
    ) {
        return exec()
    } else if (keys[0].isPrintable()) {
        modeState.keyCombination += keys[0].toMapstr()
        if (
            typeof modeState.numKeysOrTerminator === "number" &&
            --modeState.numKeysOrTerminator <= 0
        )
            return exec()
    }
    return { keys: [], exstr: "", isMatch: true }
}

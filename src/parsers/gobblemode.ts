import state from '../state'
import {isSimpleKey} from '../keyseq'
import {MsgSafeKeyboardEvent} from '../msgsafe'

/** Simple container for the gobble state. */
class GobbleState {
    public numChars = 0
    public chars = ''
    public endCommand = ''
}

let modeState: GobbleState = undefined

/** Init gobble mode. After parsing the defined number of input keys, execute
`endCmd` with attached parsed input. `Escape` cancels the mode and returns to
normal mode. */
export function init(numChars: number, endCommand: string) {
    state.mode = 'gobble'
    modeState = new GobbleState()
    modeState.numChars = numChars;
    modeState.endCommand = endCommand;
}

/** Reset state. */
function reset() {
    modeState = undefined
    state.mode = 'normal'
}

/** Receive keypress. If applicable, execute a command. */
export function parser(keys: MsgSafeKeyboardEvent[]) {
    const key = keys[0].key

    if (key === 'Escape') {
        reset()
    } else if (isSimpleKey(keys[0])) {
        modeState.chars += key
        if (modeState.chars.length >= modeState.numChars) {
            const ex_str = modeState.endCommand + ' ' + modeState.chars
            reset()
            return { keys: [], ex_str }
        }
    }
    return { keys: [], ex_str: '' }
}

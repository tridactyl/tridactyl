/** Accept n [mode] commands then execute the other command */

import { contentState } from "../content/state_content"
import * as keyseq from "../lib/keyseq"
import { mode2maps } from "../lib/binding"

/** Simple container for the nmode state. */
class NModeState {
    public numCommands = 1
    public curCommands = 0
    public mode = "normal"
    public endCommand = ""
}

let modeState: NModeState

/** Init n [mode] mode. After parsing the defined number of commands, execute
`endCmd`. `Escape` cancels the mode and executes `endCmd`. */
export function init(endCommand: string, mode = "normal", numCommands = 1) {
    contentState.mode = "nmode"
    modeState = new NModeState()
    modeState.endCommand = endCommand
    modeState.numCommands = numCommands
    modeState.mode = mode
}

/** Receive keypress. If applicable, execute a command. */
export function parser(keys: keyseq.KeyEventLike[]) {
    keys = keyseq.stripOnlyModifiers(keys)
    if (keys.length === 0) return { keys: [], isMatch: false }
    const conf = mode2maps.get(modeState.mode) || modeState.mode + "maps"
    const maps = keyseq.keyMap(conf)
    keyseq.translateKeysInPlace(keys, conf)
    const key = keys[0].key

    if (key === "Escape") {
        const exstr = modeState.endCommand
        modeState = undefined
        return { keys: [], exstr }
    }
    const response = keyseq.parse(keys, maps)

    if ((response.exstr !== undefined && response.isMatch) || !response.isMatch)
        modeState.curCommands += 1
    if (modeState.curCommands >= modeState.numCommands) {
        const prefix =
            response.exstr === undefined
                ? ""
                : "composite " + response.exstr + "; "
        response.exstr = prefix + modeState.endCommand // NB: this probably breaks any `js` binds
        modeState = undefined
    }
    return response
}

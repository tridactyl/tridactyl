/** Accept n [mode] commands then execute the other command */

import { contentState } from "@src/content/state_content"
import * as config from "@src/lib/config"
import * as keyseq from "@src/lib/keyseq"

/** Simple container for the gobble state. */
class NModeState {
    public numCommands = 1
    public curCommands = 0
    public mode = "normal"
    public endCommand = ""
}

let modeState: NModeState

/** Init n [mode] mode. After parsing the defined number of commands, execute
`endCmd`. `Escape` cancels the mode and executes `endCmd`. */
export function init(endCommand: string, mode = "normal", numCommands: number = 1) {
    contentState.mode = "nmode"
    modeState = new NModeState()
    modeState.endCommand = endCommand
    modeState.numCommands = numCommands
    modeState.mode = mode
}

// Borrowed from content/controller_content.ts
const configs = {
    normal: "nmaps",
    insert: "imaps",
    input: "inputmaps",
    ignore: "ignoremaps",
    visual: "vmaps",
}

/** Receive keypress. If applicable, execute a command. */
export function parser(keys: KeyboardEvent[]) {
    // Borrowed from genericmode.ts
    const conf = configs[modeState.mode] || modeState.mode + "maps"
    let maps: any = config.get(conf)
    if (maps === undefined) throw new Error("No binds defined for this mode. Reload page with <C-r> and add binds, e.g. :bind --mode=[mode] <Esc> mode normal")

    // If so configured, translate keys using the key translation map
    if (config.get("keytranslatemodes")[conf] === "true") {
        const translationmap = config.get("keytranslatemap")
        keyseq.translateKeysUsingKeyTranslateMap(keys, translationmap)
    }

    // Convert to KeyMap
    maps = new Map(Object.entries(maps))
    maps = keyseq.mapstrMapToKeyMap(maps)
    // genericmode.ts borrowing ends

    const key = keys[0].key

    if (key === "Escape") {
        const exstr = modeState.endCommand
        modeState = undefined
        return { keys: [], exstr }
    }
    const response = keyseq.parse(keys, maps)

    if (response.exstr != "") modeState.curCommands += 1
    if (modeState.curCommands >= modeState.numCommands) {
        const prefix =
          (response.exstr === undefined) ? "" : ("composite " + response.exstr + "; ")
        response.exstr = prefix + modeState.endCommand // NB: this probably breaks any `js` binds
        modeState = undefined
    }
    return response
}

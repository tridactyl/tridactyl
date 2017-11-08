import {normalmode, insertmode} from './parsing'
import {parser as hintmode_parser} from './hinting_background'

type ModeName = 'normal'|'insert'|'hint'

class State {
    modes = {
        normal: normalmode.parser,
        insert: insertmode.parser,
        hint: hintmode_parser,
    }

    mode: ModeName = 'normal'
}

const state = new State()
export {state as default}

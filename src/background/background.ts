import * as I from 'immutable'
import * as C from '../common'
import * as U from '../util'

let globalState = C.GlobalState()

function setGlobalState(s: C.GlobalState) {
    globalState = s
}
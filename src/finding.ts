/** find links.

    TODO:

    important
        Connect to input system
        Gluing into tridactyl
    unimportant
        Frames
        Redraw on reflow
*/

import * as DOM from './dom'
import {log} from './math'
import {permutationsWithReplacement, islice, izip, map} from './itertools'
import {hasModifiers} from './keyseq'
import state from './state'
import {messageActiveTab, message} from './messaging'
import * as config from './config'
import * as TTS from './text_to_speech'
import Logger from './logging'
import Mark from 'mark.js'
const logger = new Logger('finding')

/** Simple container for the state of a single frame's finds. */
class findState {
    readonly findHost = document.createElement('div')
    public mark = new Mark(window.document)
    constructor(){
        this.findHost.classList.add("TridactylfindHost")
    }
    public filter = ''

    destructor() {
        // Remove all finds from the DOM.
        this.findHost.remove()
    }
}

let findModeState: findState = undefined

/** For each findable element, add a find */


/** Show only finds prefixed by fstr. Focus first match */
function filter(fstr) {
    findModeState.mark.unmark()
    findModeState.mark.mark(fstr)
}

/** Remove all finds, reset STATE. */
function reset() {
    findModeState.mark.unmark()
    findModeState.destructor()
    findModeState = undefined
    state.mode = 'normal'
}

export function findPage() {
    console.log("finding got called in content")
    state.mode = 'find'
    findModeState = new findState()
    document.body.appendChild(findModeState.findHost)
}

/** If key is in findchars, add it to filtstr and filter */
function pushKey(ke) {
    console.log("the right pushkey got ccalled")
    if (hasModifiers(ke)) {
        return
    } else if (ke.key === 'Backspace') {
        findModeState.filter = findModeState.filter.slice(0,-1)
        filter(findModeState.filter)
    } else if (ke.key.length > 1) {
        return
    } else {
        findModeState.filter += ke.key
        filter(findModeState.filter)
    }
}


import {addListener, attributeCaller} from './messaging'
addListener('finding_content', attributeCaller({
    pushKey,
    reset,
    findPage,
}))

/** Find mode.

    TODO:

    important
        n/N
        ?
        show command line with user input?
        performance
        allow spaces
*/

import * as DOM from './dom'
import {hasModifiers} from './keyseq'
import state from './state'
import {messageActiveTab, message} from './messaging'
import * as config from './config'
import Logger from './logging'
import Mark from 'mark.js'
const logger = new Logger('finding')

function elementswithtext() {
    return DOM.getElemsBySelector("*",
        [hint => {
            return hint.textContent != ""
        }]
    )
}

/** Simple container for the state of a single frame's finds. */
class findState {
    readonly findHost = document.createElement('div')
    public mark = new Mark(elementswithtext())
    public markedels = []
    public markpos = 0
    public direction: 1 | -1 = 1
    public submode: "search" | "nav" = "search"
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
    // for some reason, doing the mark in the done function speeds this up immensely
    // nb: https://jsfiddle.net/julmot/973gdh8g/ is pretty much what we want
    findModeState.mark.unmark({done: () => {
        findModeState.mark.mark(fstr, {
            separateWordSearch: false,
            acrossElements: true,
        })
    }})
}

/** Remove all finds, reset STATE. */
function reset(args = {leavemarks: "false"}) {
    if (args.leavemarks == "false") findModeState.mark.unmark()
    findModeState.destructor()
    findModeState = undefined
    state.mode = 'normal'
}

function mode(mode: "nav" | "search"){
    findModeState.submode = mode
    if (mode == "nav"){
        // really, this should happen all the time when in search - we always want first result to be green and the window to move to it (if not already on screen)
        findModeState.markedels = Array.from(window.document.getElementsByTagName("mark"))
        findModeState.markpos = 0
        let el = findModeState.markedels[0]
        if (!DOM.isVisible(el)) el.scrollIntoView()
        el.style.background = "greenyellow"
    }
}

function navigate(n: number = 1){
    // also - really - should probably actually make this be an excmd
    // people will want to be able to scroll and stuff.
    // should probably move this to an update function?
    // don't hardcode this colour
    findModeState.markedels[findModeState.markpos].style.background = "yellow"
    findModeState.markpos += n*findModeState.direction
    // obvs need to do mod to wrap indices
    let el = findModeState.markedels[findModeState.markpos]
    if (!DOM.isVisible(el)) el.scrollIntoView()
    el.style.background = "greenyellow"
}

export function findPage(direction?: 1|-1) {
    console.log("finding got called in content")
    state.mode = 'find'
    findModeState = new findState()
    if (direction !== undefined) findModeState.direction = direction
    document.body.appendChild(findModeState.findHost)
}

/** If key is in findchars, add it to filtstr and filter */
function pushKey(ke) {
    console.log("the right pushkey got ccalled")
    switch (findModeState.submode) {
        case "search":
            if (ke.key === 'Backspace') {
                findModeState.filter = findModeState.filter.slice(0,-1)
                filter(findModeState.filter)
            } else if (ke.key === 'Enter') {
                mode("nav")
            } else if (ke.key === 'Escape'){
                reset()
            } else if (ke.key.length > 1) {
                return
            } else {
                findModeState.filter += ke.key
                filter(findModeState.filter)
            }
            break
        case "nav":
            if (ke.key === 'n') {
                navigate(1)
            } else if (ke.key === 'N') {
                navigate(-1)
            } else if (ke.key === 'Escape'){
                mode("search")
            } else if (ke.key === 'Enter'){
                reset({leavemarks: "true"})
            } else if (ke.key.length > 1) {
                return
            }
            break
    }
}


import {addListener, attributeCaller} from './messaging'
addListener('finding_content', attributeCaller({
    pushKey,
    mode,
    reset,
    findPage,
}))

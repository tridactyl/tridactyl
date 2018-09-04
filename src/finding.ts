/** Find mode.

    TODO:

    important
        n/N
        ?
        show command line with user input?
        performance
        allow spaces
*/

import * as DOM from "./dom"
import { hasModifiers } from "./keyseq"
import { contentState } from "./state_content"
import { messageActiveTab, message } from "./messaging"
import * as config from "./config"
import Logger from "./logging"
import Mark from "mark.js"
const logger = new Logger("finding")

function elementswithtext() {
    return DOM.getElemsBySelector(
        "*",
        // offsetHeight tells us which elements are drawn
        [
            hint => {
                return (
                    (hint as any).offsetHeight > 0 &&
                    (hint as any).offsetHeight !== undefined
                )
            },
            hint => {
                return hint.textContent != ""
            },
        ],
    )
}

/** Simple container for the state of a single frame's finds. */
class findState {
    readonly findHost = document.createElement("div")
    public mark = new Mark(elementswithtext())
    // ^ why does filtering by offsetHeight NOT work here
    public markedels = []
    public markpos = 0
    public direction: 1 | -1 = 1
    constructor() {
        this.findHost.classList.add("TridactylfindHost")
    }
    public filter = ""

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
    findModeState.mark.unmark({
        done: () => {
            findModeState.mark.mark(fstr, {
                separateWordSearch: false,
                acrossElements: true,
            })
        },
    })
}

/** Remove all finds, reset STATE. */
function reset(args?) {
    if (args.leavemarks == "false") findModeState.mark.unmark()
    if (args.unfind == "true") {
        findModeState.mark.unmark()
        findModeState.destructor()
        findModeState = undefined
    }
    contentState.mode = "normal"
}

function mode(mode: "nav" | "search") {
    if (mode == "nav") {
        // really, this should happen all the time when in search - we always want first result to be green and the window to move to it (if not already on screen)
        findModeState.markedels = Array.from(
            window.document.getElementsByTagName("mark"),
        ).filter(el => el.offsetHeight > 0)
        // ^ why does filtering by offsetHeight work here
        findModeState.markpos = 0
        let el = findModeState.markedels[0]
        if (el) {
            if (!DOM.isVisible(el)) el.scrollIntoView()
            // colour of the selected link
            el.style.background = "lawngreen"
        } else {
            messageActiveTab("commandline_frame", "fillcmdline", [
                "# Couldn't find pattern: " + findModeState.filter,
            ])
        }
    }
}

import "./number.mod"
export function navigate(n: number = 1) {
    // also - really - should probably actually make this be an excmd
    // people will want to be able to scroll and stuff.
    // should probably move this to an update function?
    // don't hardcode this colour
    findModeState.markedels[findModeState.markpos].style.background = "yellow"
    findModeState.markpos = (
        findModeState.markpos +
        n * findModeState.direction
    ).mod(findModeState.markedels.length)
    // obvs need to do mod to wrap indices
    let el = findModeState.markedels[findModeState.markpos]
    if (!DOM.isVisible(el)) el.scrollIntoView()
    el.style.background = "lawngreen"
}

export function findPage(direction?: 1 | -1) {
    if (findModeState !== undefined) reset({ unfind: "true" })
    contentState.mode = "find"
    findModeState = new findState()
    if (direction !== undefined) findModeState.direction = direction
    document.body.appendChild(findModeState.findHost)
}

/** If key is in findchars, add it to filtstr and filter */
function pushKey(ke) {
    if (ke.key === "Backspace") {
        findModeState.filter = findModeState.filter.slice(0, -1)
        filter(findModeState.filter)
    } else if (ke.key === "Enter") {
        mode("nav")
        reset({ leavemarks: "true" })
    } else if (ke.key === "Escape") {
        reset({ unfind: "true" })
    } else if (ke.key.length > 1) {
        return
    } else {
        findModeState.filter += ke.key
        filter(findModeState.filter)
    }
}

export function parser(keys: KeyboardEvent[]) {
    for (const { key } of keys) {
        pushKey(key)
    }
    return { keys: [], ex_str: "", isMatch: true }
}

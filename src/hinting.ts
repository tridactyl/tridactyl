/** Hint links.

    TODO:

    important
        Connect to input system
        Gluing into tridactyl
    unimportant
        Frames
        Redraw on reflow
*/

import {elementsByXPath, isVisible, mouseEvent} from './dom'
import {log} from './math'
import {permutationsWithReplacement, islice, izip, map} from './itertools'
import {hasModifiers} from './keyseq'
import state from './state'

/** Simple container for the state of a single frame's hints. */
class HintState {
    public focusedHint: Hint
    readonly hintHost = document.createElement('div')
    readonly hints: Hint[] = []
    public filter = ''
    public hintchars = ''

    destructor() {
        // Undo any alterations of the hinted elements
        for (const hint of this.hints) {
            hint.hidden = true
        }

        // Remove all hints from the DOM.
        this.hintHost.remove()
    }
}

let modeState: HintState = undefined

/** For each hintable element, add a hint */
export function hintPage(hintableElements: Element[], onSelect: HintSelectedCallback) {
    modeState = new HintState()
    for (let [el, name] of izip(hintableElements, hintnames())) {
        modeState.hintchars += name
        modeState.hints.push(new Hint(el, name, onSelect))
    }
    console.log("HINTS", modeState.hints)
    modeState.focusedHint = modeState.hints[0]
    modeState.focusedHint.focused = true
    document.body.appendChild(modeState.hintHost)
}

/** vimperator-style minimal hint names */
function* hintnames(hintchars = HINTCHARS) {
    let taglen = 1
    while (true) {
        yield* map(permutationsWithReplacement(hintchars, taglen), e=>e.join(''))
        taglen++
    }
}

type HintSelectedCallback = (Hint) => any

/** Place a flag by each hintworthy element */
class Hint {
    private readonly flag = document.createElement('span')

    constructor(
        private readonly target: Element,
        public readonly name: string,
        private readonly onSelect: HintSelectedCallback
    ) {
        const rect = target.getClientRects()[0]
        this.flag.textContent = name
        this.flag.className = 'TridactylHint'
        /* this.flag.style.cssText = ` */
        /*     top: ${rect.top}px; */
        /*     left: ${rect.left}px; */
        /* ` */
        this.flag.style.cssText = `
            top: ${window.scrollY + rect.top}px;
            left: ${window.scrollX + rect.left}px;
        `
        modeState.hintHost.appendChild(this.flag)
        target.classList.add('TridactylHintElem')
    }

    // These styles would be better with pseudo selectors. Can we do custom ones?
    // If not, do a state machine.
    set hidden(hide: boolean) {
        this.flag.hidden = hide
        if (hide) {
            this.focused = false
            this.target.classList.remove('TridactylHintElem')
        } else
            this.target.classList.add('TridactylHintElem')
    }

    set focused(focus: boolean) {
        if (focus) {
            this.target.classList.add('TridactylHintActive')
            this.target.classList.remove('TridactylHintElem')
        } else {
            this.target.classList.add('TridactylHintElem')
            this.target.classList.remove('TridactylHintActive')
        }
    }

    select() {
        this.onSelect(this)
    }
}

/** Uniform length hintnames */
function* hintnames_uniform(n: number, hintchars = HINTCHARS) {
    if (n <= hintchars.length)
        yield* islice(hintchars[Symbol.iterator](), n)
    else {
        // else calculate required length of each tag
        const taglen = Math.ceil(log(n, hintchars.length))
        // And return first n permutations
        yield* islice(permutationsWithReplacement(hintchars, taglen), n)
    }
}

const HINTCHARS = 'hjklasdfgyuiopqwertnmzxcvb'
/* const HINTCHARS = 'asdf' */

/** Show only hints prefixed by fstr. Focus first match */
function filter(fstr) {
    console.log(fstr)
    const active: Hint[] = []
    let foundMatch
    for (let h of modeState.hints) {
        if (!h.name.startsWith(fstr)) h.hidden = true
        else {
            if (! foundMatch) {
                h.focused = true
                modeState.focusedHint = h
                foundMatch = true
            }
            h.hidden = false
            active.push(h)
        }

    }
    if (active.length == 1) {
        selectFocusedHint()
    }
}

/** Remove all hints, reset STATE. */
function reset() {
    modeState.destructor()
    modeState = undefined
}

/** If key is in hintchars, add it to filtstr and filter */
function pushKey(ke) {
    if (hasModifiers(ke)) {
        return
    } else if (ke.key === 'Backspace') {
        modeState.filter = modeState.filter.slice(0,-1)
        filter(modeState.filter)
    } else if (ke.key.length > 1) {
        return
    } else if (modeState.hintchars.includes(ke.key)) {
        modeState.filter += ke.key
        filter(modeState.filter)
    }
}

/** Array of hintable elements in viewport

    Elements are hintable if
        1. they can be meaningfully selected, clicked, etc
        2. they're visible
            1. Within viewport
            2. Not hidden by another element
*/
function hintables() {
    return [...elementsByXPath(HINTTAGS)].filter(isVisible) as any as Element[]
}

// XPath.
const HINTTAGS = `
//input[not(@type='hidden' or @disabled)] |
//a |
//area |
//iframe  |
//textarea  |
//button |
//select |
//*[
    @onclick or
    @onmouseover or
    @onmousedown or
    @onmouseup or
    @oncommand or
    @role='link'or
    @role='button' or
    @role='checkbox' or
    @role='combobox' or
    @role='listbox' or
    @role='listitem' or
    @role='menuitem' or
    @role='menuitemcheckbox' or
    @role='menuitemradio' or
    @role='option' or
    @role='radio' or
    @role='scrollbar' or
    @role='slider' or
    @role='spinbutton' or
    @role='tab' or
    @role='textbox' or
    @role='treeitem' or
    @tabindex
]`

// DEBUGGING
/* hintPage(hintables(), hint=>mouseEvent(hint.target, 'click')) */
/* addEventListener('keydown', pushKey) */

function hintPageSimple() {
    console.log("Hinting!")
    hintPage(hintables(), hint=>mouseEvent(hint.target, 'click'))
}

function selectFocusedHint() {
    console.log("Selecting hint.", state.mode)
    state.mode = 'normal'
    modeState.focusedHint.select()
    reset()
}

import {addListener, attributeCaller} from './messaging'
addListener('hinting_content', attributeCaller({
    pushKey,
    selectFocusedHint,
    reset,
    hintPageSimple,
}))

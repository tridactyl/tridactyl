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
import {messageActiveTab} from './messaging'

/** Simple container for the state of a single frame's hints. */
class HintState {
    public focusedHint: Hint
    readonly hintHost = html`<div class="TridactylHintHost">`
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
export function hintPage(
    hintableElements: Element[],
    onSelect: HintSelectedCallback,
    names = hintnames_uniform(hintableElements.length),
) {
    state.mode = 'hint'
    modeState = new HintState()
    for (let [el, name] of izip( hintableElements, names)) {
        console.log({el, name})
        modeState.hintchars += name
        modeState.hints.push(new Hint(el, name, onSelect))
    }

    if (modeState.hints.length) {
        console.log("HINTS", modeState.hints)
        modeState.focusedHint = modeState.hints[0]
        modeState.focusedHint.focused = true
        document.body.appendChild(modeState.hintHost)
    } else {
        reset()
    }
}

/** vimperator-style minimal hint names */
function* hintnames(hintchars = HINTCHARS): IterableIterator<string> {
    let taglen = 1
    while (true) {
        yield* map(permutationsWithReplacement(hintchars, taglen), e=>e.join(''))
        taglen++
    }
}

/** Uniform length hintnames */
function* hintnames_uniform(n: number, hintchars = HINTCHARS): IterableIterator<string> {
    if (n <= hintchars.length)
        yield* islice(hintchars[Symbol.iterator](), n)
    else {
        // else calculate required length of each tag
        const taglen = Math.ceil(log(n, hintchars.length))
        // And return first n permutations
        yield* map(islice(permutationsWithReplacement(hintchars, taglen), n),
            perm => perm.join(''))
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

const HINTCHARS = 'hjklasdfgyuiopqwertnmzxcvb'
/* const HINTCHARS = 'asdf' */

/** Show only hints prefixed by fstr. Focus first match */
function filter(fstr) {
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
    state.mode = 'normal'
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
    return Array.from(document.querySelectorAll(HINTTAGS_selectors)).filter(isVisible)
}

function elementswithtext() {
    return Array.from(document.querySelectorAll(HINTTAGS_text_selectors)).filter(
        isVisible
    ).filter(hint => {
        return hint.textContent != ""
    })
}

/** Get array of images in the viewport
 */
function hintableImages() {
    /* return [...elementsByXPath(HINTTAGS)].filter(isVisible) as any as Element[] */
    return Array.from(document.querySelectorAll(HINTTAGS_img_selectors)).filter(
        isVisible)
}

/** Get arrat of "anchors": elements which have id or name and can be addressed
 * with the hash/fragment in the URL
 */
function anchors() {
    return Array.from(document.querySelectorAll(HINTTAGS_anchor_selectors))
        .filter(isVisible)
}

// CSS selectors. More readable for web developers. Not dead. Leaves browser to care about XML.
const HINTTAGS_selectors = `
input:not([type=hidden]):not([disabled]),
a,
area,
iframe,
textarea,
button,
select,
[onclick],
[onmouseover],
[onmousedown],
[onmouseup],
[oncommand],
[role='link'],
[role='button'],
[role='checkbox'],
[role='combobox'],
[role='listbox'],
[role='listitem'],
[role='menuitem'],
[role='menuitemcheckbox'],
[role='menuitemradio'],
[role='option'],
[role='radio'],
[role='scrollbar'],
[role='slider'],
[role='spinbutton'],
[role='tab'],
[role='textbox'],
[role='treeitem'],
[class*='button'],
[tabindex]
`

const HINTTAGS_text_selectors = `
input:not([type=hidden]):not([disabled]),
a,
area,
iframe,
textarea,
button,
p,
div,
pre,
code,
span
`

const HINTTAGS_img_selectors = `
img,
[src]
`

const HINTTAGS_anchor_selectors = `
[id],
[name]
`

import {activeTab, browserBg, l, firefoxVersionAtLeast} from './lib/webext'

async function openInBackground(url: string) {
    const thisTab = await activeTab()
    const options: any = {
        active: false,
        url,
        index: thisTab.index + 1,
    }
    if (await l(firefoxVersionAtLeast(57))) options.openerTabId = thisTab.id
    return browserBg.tabs.create(options)
}

/** if `target === _blank` clicking the link is treated as opening a popup and is blocked. Use webext API to avoid that. */
function simulateClick(target: HTMLElement) {
    // target can be set to other stuff, and we'll fail in annoying ways.
    // There's no easy way around that while this code executes outside of the
    // magic 'short lived event handler' context.
    //
    // OTOH, hardly anyone uses that functionality any more.
    if ((target as HTMLAnchorElement).target === '_blank' ||
        (target as HTMLAnchorElement).target === '_new'
    ) {
        browserBg.tabs.create({url: (target as HTMLAnchorElement).href})
    } else {
        mouseEvent(target, "click")
        // Sometimes clicking the element doesn't focus it sufficiently.
        target.focus()
    }
}

function hintPageOpenInBackground() {
    hintPage(hintables(), hint=>{
        hint.target.focus()
        if (hint.target.href) {
            // Try to open with the webext API. If that fails, simulate a click on this page anyway.
            openInBackground(hint.target.href).catch(()=>simulateClick(hint.target))
        } else {
            // This is to mirror vimperator behaviour.
            simulateClick(hint.target)
        }
    })
}

function hintPageSimple() {
    hintPage(hintables(), hint=>{
        simulateClick(hint.target)
    })
}

function hintPageTextYank() {
    hintPage(elementswithtext(), hint=>{
        messageActiveTab("commandline_frame", "setClipboard", [hint.target.textContent])
    })
}

function hintPageYank() {
    hintPage(hintables(), hint=>{
        messageActiveTab("commandline_frame", "setClipboard", [hint.target.href])
    })
}

/** Hint anchors and yank the URL on selection
 */
function hintPageAnchorYank() {

    hintPage(anchors(), hint=>{

        let anchorUrl = new URL(window.location.href)

        anchorUrl.hash = hint.target.id || hint.target.name;

        messageActiveTab("commandline_frame", "setClipboard", [anchorUrl.href])
    })
}

/** Hint images, opening in the same tab, or in a background tab
 *
 * @param inBackground  opens the image source URL in a background tab,
 *                      as opposed to the current tab
 */
function hintImage(inBackground) {
    hintPage(hintableImages(), hint=>{
        let img_src = hint.target.getAttribute("src")

        if (inBackground) {
            openInBackground(new URL(img_src, window.location.href).href)
        } else {
            window.location.href = img_src
        }
    })
}

/** Hint elements to focus */
function hintFocus() {
    hintPage(hintables(), hint=>{
        hint.target.focus()
    })
}

function selectFocusedHint() {
    console.log("Selecting hint.", state.mode)
    const focused = modeState.focusedHint
    reset()
    focused.select()
}

import {addListener, attributeCaller} from './messaging'
addListener('hinting_content', attributeCaller({
    pushKey,
    selectFocusedHint,
    reset,
    hintPageSimple,
    hintPageYank,
    hintPageTextYank,
    hintPageAnchorYank,
    hintPageOpenInBackground,
    hintImage,
    hintFocus,
}))

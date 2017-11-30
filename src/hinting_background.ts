import {messageActiveTab} from './messaging'

async function pushKey(key) {
    return await messageActiveTab('hinting_content', 'pushKey', [key])
}

async function selectFocusedHint() {
    return await messageActiveTab('hinting_content', 'selectFocusedHint')
}

async function reset() {
    return await messageActiveTab('hinting_content', 'reset')
}

export async function hintPageYank() {
    return await messageActiveTab('hinting_content', 'hintPageYank')
}

export async function hintPageTextYank() {
    return await messageActiveTab('hinting_content', 'hintPageTextYank')
}

export async function hintPageAnchorYank() {
    return await messageActiveTab('hinting_content', 'hintPageAnchorYank')
}

export async function hintPageSimple(selectors?) {
    return await messageActiveTab('hinting_content', 'hintPageSimple',[selectors])
}

export async function hintPageOpenInBackground() {
    return await messageActiveTab('hinting_content', 'hintPageOpenInBackground')
}

export async function hintImage(inBackground) {
    return await messageActiveTab('hinting_content', 'hintImage', [inBackground])
}

export async function hintFocus() {
    return await messageActiveTab('hinting_content', 'hintFocus')
}

import {MsgSafeKeyboardEvent} from './msgsafe'

/** At some point, this might be turned into a real keyseq parser

    reset and selectFocusedHints are OK candidates for map targets in the
    future. pushKey less so, I think.

*/
export function parser(keys: MsgSafeKeyboardEvent[]) {
    console.log("hintparser", keys)
    const key = keys[0].key
    if (key === 'Escape') {
        reset()
    } else if (['Enter', ' '].includes(key)) {
        selectFocusedHint()
    } else {
        pushKey(keys[0])
    }
    return {keys: [], ex_str: ''}
}

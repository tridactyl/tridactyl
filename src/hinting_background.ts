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

/** At some point, this might be turned into a real keyseq parser

    if Enter, select focusedHint and reset, or reset on Escape.
    else give to the hintfilter
*/
export function parser(keys) {
    const key = keys[0].key
    if (key === 'Enter' || key === 'Escape') {
        if (key === 'Enter') selectFocusedHint()
        reset()
        return {keys: [], ex_str: 'mode normal'}
    } else {
        pushKey(keys[0])
        return {keys: [], ex_str: ''}
    }
}

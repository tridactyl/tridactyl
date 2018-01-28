import {messageActiveTab} from './messaging'

async function pushKey(key) {
    console.log("tried to call the real pushkey")
    return await messageActiveTab('finding_content', 'pushKey', [key])
}

export async function findPage() {
    console.log("tried to call finding")
    return await messageActiveTab('finding_content', 'findPage')
}
async function reset() {
    return await messageActiveTab('finding_content', 'reset')
}

import {MsgSafeKeyboardEvent} from './msgsafe'

/** At some point, this might be turned into a real keyseq parser

    reset and selectFocusedfinds are OK candidates for map targets in the
    future. pushKey less so, I think.

*/
export function parser(keys: MsgSafeKeyboardEvent[]) {
    const key = keys[0].key
    if (key === 'Escape') {
        reset()
    } else {
        pushKey(keys[0])
    }
    return {keys: [], ex_str: ''}
}

import {messageActiveTab} from './messaging'

async function pushKey(key) {
    return await messageActiveTab('finding_content', 'pushKey', [key])
}

export async function findPage(direction) {
    return await messageActiveTab('finding_content', 'findPage', [direction])
}

export async function findPageNavigate(n: number) {
    return await messageActiveTab('finding_content', 'navigate', [n])
}

async function reset(args = {leavemarks: "false"}) {
    return await messageActiveTab('finding_content', 'reset', [args])
}

import {MsgSafeKeyboardEvent} from './msgsafe'

/** At some point, this might be turned into a real keyseq parser

    reset and selectFocusedfinds are OK candidates for map targets in the
    future. pushKey less so, I think.

*/
export function parser(keys: MsgSafeKeyboardEvent[]) {
    const key = keys[0].key
    // if (key === 'Escape') {
    //     reset()
    // } else if (key === 'Enter') {
    //     reset({leavemarks: "true"})
    // } else {
    pushKey(keys[0])
    // }
    return {keys: [], ex_str: ''}
}

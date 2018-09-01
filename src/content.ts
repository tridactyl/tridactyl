import "./dispatch_test"

// function x(a: number) { return a }

// x('a')

/* This doesn't work atm because keyseq's dependencies aren't here yet.
// import normal from '/modes/normal'
const normal = {} as any

import Mode from '~/modes'

let STATE = {
    mode: new Mode("normal", normal)
}

function handleKey(keyEvent) {
    try {
        STATE.mode = STATE.mode.onKey(keyEvent)
    } catch (e) {
        console.error('MODE crash', e)
        throw e
    }
}

// Later other key sources might be added here.
window.addEventListener('keydown', handleKey)
*/

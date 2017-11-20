import * as convert from '../convert'
import browserProxy from './browser_proxy'

export function inContentScript() {
    return ! ('tabs' in browser)
}

export let browserBg

// Make this library work for both content and background.
if (inContentScript()) {
    browserBg = browserProxy
} else {
    browserBg = browser
}

/** await a promise and console.error and rethrow if it errors

    Errors from promises don't get logged unless you seek them out.

    There's an event for catching these, but it's not implemented in firefox
    yet: https://bugzilla.mozilla.org/show_bug.cgi?id=1269371
*/
export async function l(promise) {
    try {
        return await promise
    } catch (e) {
        console.error(e)
        throw e
    }
}


/** The first active tab in the currentWindow.
 *
 * TODO: Highlander theory: Can there ever be more than one?
 *
 */
//#background_helper
export async function activeTab() {
    return (await l(browserBg.tabs.query({active: true, currentWindow: true})))[0]
}

//#background_helper
export async function activeTabId() {
    return (await activeTab()).id
}

/** Compare major firefox versions */
export async function firefoxVersionAtLeast(desiredmajor: number) {
    const versionstr = (await browserBg.runtime.getBrowserInfo()).version
    const actualmajor = convert.toNumber(versionstr.split('.')[0])
    return actualmajor >= desiredmajor
}

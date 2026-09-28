/** Shim to access BG browser APIs from content. */

export function shim(api, func, args) {
    return browser[api][func](...args)
}

export async function setReaderArticle(key: string, value: string) {
    if (!browser.storage.session) return false
    await browser.storage.session.set({ [key]: value })
    return true
}

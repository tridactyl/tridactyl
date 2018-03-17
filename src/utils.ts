export function isContentScript(): boolean {
    return !('tabs' in browser)
}

export async function getStorage(key: string): Promise<any> {
    const store = await browser.storage.sync.get(key)
    return store[key]
}

export async function setStorage(
    key: string,
    store: browser.storage.StorageValue
): Promise<void> {
    browser.storage.sync.set({[key]: store})
}

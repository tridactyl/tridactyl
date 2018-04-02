import { List, Map } from 'immutable'

export type MayPromise<T> = T | Promise<T>
export type Maybe<T> = T | null

export function joinAfter(x: number, list: List<string>): List<string> {
    const head = list.slice(0, x - 1)
    const tail = list.slice(x).join(' ')
    return head.concat(tail)
}

export function parseBool(str: string): boolean {
    if (str === 'true') return true
    if (str === 'false') return false
    throw Error(`'${str}' is not a boolean`)
}

export function identity<T>(i: T): T {
    return i
}

export function flattenList<T>(list: List<List<T>>): List<T> {
    return List().concat(...list)
}

export function flattenArray<T>(arr: T[][]): T[] {
    return Array.prototype.concat(...arr)
}

export function unimplemented(): never {
    throw Error('this functionality is not yet implemented')
}

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
    browser.storage.sync.set({ [key]: store })
}

export function toArray<T>(arg: T | T[] | null): T[] {
    if (!arg) return []
    return Array.isArray(arg) ? arg : [arg]
}

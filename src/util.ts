import { List, Map } from "immutable"

export type MayPromise<T> = T | Promise<T>
export type Maybe<T> = T | null
export type MayArray<T> = T | T[]
export type MayList<T> = T | List<T>
export type ContxID = browser.contextualIdentities.ContextualIdentity
export type BrowserTab = browser.tabs.Tab
export type HistItem = browser.history.HistoryItem
export type Bookmark = browser.bookmarks.BookmarkTreeNode
export type RArray<T> = ReadonlyArray<T>
export type OMAP<T> = { [k: string]: T }

/**
 * Takes a list of strings and joins all the strings after x. Ex:
 * `['a', 'b', 'c', 'd'] at x=1 => ['ab', 'cd']` since 1 is 'b' and everything
 * after that is joined together
 *
 * @param x 0-based index after which elements are joined
 * @param list List of strings
 */
export function joinAfter(x: number, list: List<string>): List<string> {
    const i = x - 1
    const head = list.slice(0, i)
    const tail = list.slice(i)
    if (isListEmpty(tail)) return list
    return head.concat(tail.join(" "))
}

export function parseBool(str: string): boolean {
    if (str === "true") return true
    if (str === "false") return false
    throw Error(`'${str}' is not a boolean`)
}

export const identity = <T>(x: T) => x
export const flattenList = <T>(list: List<List<T>>): List<T> =>
    List().concat(...list)
export const flattenArray = <T>(arr: T[][]): T[] =>
    Array.prototype.concat(...arr)
export const unimplemented = () => {
    throw Error("this functionality is not yet implemented")
}
export const isContentScript = () => !("tabs" in browser)
export const isEmpty = (l: { length: number }) => l.length === 0
export const isListEmpty = (l: List<any>) => l.size === 0

export async function getStorage(key: string): Promise<any> {
    const store = await browser.storage.sync.get(key)
    return store[key]
}

export async function setStorage(
    key: string,
    store: browser.storage.StorageValue,
): Promise<void> {
    browser.storage.sync.set({ [key]: store })
}

export function toArray<T>(arg: T | T[] | null | undefined): T[] {
    if (!arg) return []
    return Array.isArray(arg) ? arg : [arg]
}

export function toList<T>(arg: T | T[] | List<T> | null | undefined): List<T> {
    if (!arg) return List()
    if (List.isList(arg)) return arg
    if (Array.isArray(arg)) return List(arg)
    return List.of(arg)
}

export function errorIfNull<T>(
    a: T | null | undefined,
    emsg = "Value not found",
): T {
    if (a) return a
    throw Error(emsg)
}

export const tokeniseOnWhitespace = (s: string) => s.split(/\s+/)

/**
 * Extracts the command name from the raw exstring. The command is always the
 * first space-delimited token
 *
 * @param exstr The raw exstr
 */
export const extractCommandFromExstr = (exstr: string) =>
    tokeniseOnWhitespace(exstr)[0]

export function listToObjMap<V>(
    list: List<any>,
    key: string,
    val: string,
): { [key: string]: V } {
    return list.filter(x => x[val]).reduce((obj, item) => {
        obj[item[key]] = item[val]
        return obj
    }, {})
}

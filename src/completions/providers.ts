import * as config from "@src/lib/config"
import { browserBg } from "@src/lib/webext"
import Fuse from "fuse.js"

export function newtaburl() {
    // In the nonewtab version, this will return `null` and upset getURL.
    // Ternary op below prevents the runtime error.
    const newtab = browser.runtime.getManifest().chrome_url_overrides.newtab
    return newtab !== null ? browser.runtime.getURL(newtab) : null
}

export type Bookmark = { path?: string } & browser.bookmarks.BookmarkTreeNode

let allBookmarks: Bookmark[]
let bookmarksFuse: Fuse<Bookmark>

async function collectBookmarks(): Promise<Bookmark[]> {
    const root = await browserBg.bookmarks.getTree()
    const bookmarks = root.flatMap(flattenChildren)
    const bookmarksDictionary = bookmarks.reduce((dict, bookmark) => {
        dict[bookmark.id] = bookmark
        return dict
    }, {})
    return bookmarks
        .map(bookmark => ({
            path: buildBookmarkPath("", bookmark, bookmarksDictionary),
            ...bookmark,
        }))
        .filter(isValidBookmark)
        .sort((a, b) => b.dateAdded - a.dateAdded)
}

function flattenChildren(
    node: browser.bookmarks.BookmarkTreeNode,
): browser.bookmarks.BookmarkTreeNode[] {
    if (!node.children) {
        return [node]
    }
    return [node, ...node.children.flatMap(flattenChildren)]
}

function buildBookmarkPath(
    path: string,
    bookmark: browser.bookmarks.BookmarkTreeNode,
    allBookmarks: { string?: browser.bookmarks.BookmarkTreeNode },
): string {
    if (bookmark.id === "root________") {
        return path
    }
    const parent = allBookmarks[bookmark.parentId]
    return buildBookmarkPath(`${parent.title}/${path}`, parent, allBookmarks)
}

export async function getBookmarks(query: string): Promise<Bookmark[]> {
    allBookmarks = allBookmarks || (await collectBookmarks())
    bookmarksFuse =
        bookmarksFuse ||
        new Fuse(allBookmarks, { keys: ["path", "title", "url"] })
    // Search bookmarks, dedupe and sort by most recent.
    // TODO: enable based on configuration property
    // let bookmarks = await browserBg.bookmarks.search({ query })
    // bookmarks = bookmarks.filter(isValidBookmark)
    // bookmarks.sort((a, b) => b.dateAdded - a.dateAdded)
    let bookmarks = query
        ? bookmarksFuse.search(query).map(r => r.item)
        : allBookmarks

    // Remove duplicate bookmarks
    const seen = new Map<string, string>()
    bookmarks = bookmarks.filter(b => {
        if (seen.get(b.title) === b.url) return false
        else {
            seen.set(b.title, b.url)
            return true
        }
    })

    return bookmarks
}

function isValidBookmark(bookmark: Bookmark): boolean {
    // Remove folder nodes and bad URLs
    try {
        return !!new URL(bookmark.url)
    } catch (e) {
        return false
    }
}

export async function getSearchUrls(query: string) {
    const suconf = config.get("searchurls")

    const searchUrls = []
    for (const prop in suconf) {
        if (
            Object.prototype.hasOwnProperty.call(suconf, prop) &&
            prop.startsWith(query)
        ) {
            searchUrls.push({ title: prop, url: suconf[prop] })
        }
    }
    return searchUrls
}

function frecency(item: browser.history.HistoryItem) {
    // Doesn't actually care about recency yet.
    return item.visitCount * -1
}

export async function getHistory(
    query: string,
): Promise<browser.history.HistoryItem[]> {
    // Search history, dedupe and sort by frecency
    let history = await browserBg.history.search({
        text: query,
        maxResults: config.get("historyresults"),
        startTime: 0,
    })

    // Remove entries with duplicate URLs
    const dedupe = new Map()
    for (const page of history) {
        if (page.url !== newtaburl()) {
            if (dedupe.has(page.url)) {
                if (dedupe.get(page.url).title.length < page.title.length) {
                    dedupe.set(page.url, page)
                }
            } else {
                dedupe.set(page.url, page)
            }
        }
    }
    history = [...dedupe.values()]

    history.sort((a, b) => frecency(a) - frecency(b))

    return history
}

export async function getTopSites() {
    return (await browserBg.topSites.get()).filter(
        page => page.url !== newtaburl(),
    )
}

export async function getCombinedHistoryBmarks(
    query: string,
): Promise<Array<{ title: string; url: string }>> {
    const [history, bookmarks, searchUrls] = await Promise.all([
        getHistory(query),
        getBookmarks(query),
        getSearchUrls(query),
    ])

    // Join records by URL, using the title from bookmarks by preference.
    const combinedMap = new Map<string, any>(
        bookmarks.map(bmark => [
            bmark.url,
            { title: bmark.title, url: bmark.url, bmark },
        ]),
    )
    history.forEach(page => {
        if (combinedMap.has(page.url)) combinedMap.get(page.url).history = page
        else
            combinedMap.set(page.url, {
                title: page.title,
                url: page.url,
                history: page,
            })
    })
    searchUrls.forEach(su => {
        combinedMap.set(su.url, {
            title: su.title,
            url: su.url,
            search: true,
        })
    })

    const score = x =>
        (x.history ? frecency(x.history) : 0) -
        (x.bmark ? config.get("bmarkweight") : 0) -
        (x.search ? config.get("searchurlweight") : 0)

    return Array.from(combinedMap.values()).sort((a, b) => score(a) - score(b))
}

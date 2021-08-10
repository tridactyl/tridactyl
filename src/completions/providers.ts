import * as config from "../lib/config"
import { browserBg } from "../lib/webext"

export function newtaburl() {
    // In the nonewtab version, this will return `null` and upset getURL.
    // Ternary op below prevents the runtime error.
    const newtab = browser.runtime.getManifest().chrome_url_overrides.newtab
    return newtab !== null ? browser.runtime.getURL(newtab) : null
}

export async function getBookmarks(query: string) {
    // Search bookmarks, dedupe and sort by most recent.
    let bookmarks = await browserBg.bookmarks.search({ query })

    // Remove folder nodes and bad URLs
    bookmarks = bookmarks.filter(b => {
        try {
            return new URL(b.url)
        } catch (e) {
            return false
        }
    })

    bookmarks.sort((a, b) => b.dateAdded - a.dateAdded)

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
    const [history, bookmarks] = await Promise.all([
        getHistory(query),
        getBookmarks(query),
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

    const score = x =>
        (x.history ? frecency(x.history) : 0) -
        (x.bmark ? config.get("bmarkweight") : 0)

    return Array.from(combinedMap.values()).sort((a, b) => score(a) - score(b))
}

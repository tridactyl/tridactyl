import * as config from "@src/lib/config"
import * as State from "@src/state"
import state from "@src/state"
import { browserBg } from "@src/lib/webext"

export enum HistoryItemType {
    History,
    Bmark,
    SearchUrl,
    TopSite,
}

export class HistoryItem {
    // Wrapper class to store details of entries for HistoryCompletionSource
    constructor(
        public title: string,
        public url: string,
        public type: HistoryItemType,
        public score = -1,
    ) {}
}

export function newtaburl() {
    // In the nonewtab version, this will return `null` and upset getURL.
    // Ternary op below prevents the runtime error.
    const newtab = browser.runtime.getManifest().chrome_url_overrides.newtab
    return newtab !== null ? browser.runtime.getURL(newtab) : null
}

export async function getBookmarks(query: string): Promise<HistoryItem[]> {
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

    const bmarkScore = config.get("bmarkweight")
    return bookmarks.map(
        b => new HistoryItem(b.title, b.url, HistoryItemType.Bmark, bmarkScore),
    )
}

export function searchUrlToQuery(url: string): string {
    // Query sent to history API needs to be a space-separated
    // list of tokens, otherwise partial matches won't be found
    return url
        .split("%s")
        .map(part => decodeURIComponent(part))
        .join(" ")
}

let updateSearchUrlScoresLock = false
async function updateSearchUrlScores() {
    // Calculate and cache frecency scores for searchUrls
    if (updateSearchUrlScoresLock) {
        // This can take a few seconds - lock prevents multiple concurrent
        // calls, which could occur while typing if
        // `searchurlscoreupdateinterval` is set to a small value
        return
    }
    try {
        updateSearchUrlScoresLock = true
        const searchUrlScores = await State.getAsync("searchUrlScores")
        const searchUrls = searchUrlMap()
        const scores = new Map<string, number>()
        for (const [name, url] of searchUrls) {
            const history = await browserBg.history.search({
                text: searchUrlToQuery(url),
                startTime: 0,
            })
            const pageScores = await Promise.all(
                history.map(result => frecency(result)),
            )
            const score = pageScores.reduce((a, b) => a + b, 0)
            scores.set(name, score)
        }
        searchUrlScores.scores = scores
        searchUrlScores.lastUpdated = Date.now()
        state.searchUrlScores = searchUrlScores
    } finally {
        updateSearchUrlScoresLock = false
    }
}

async function getSearchUrlScores(): Promise<Map<string, number>> {
    // Load searchUrl scores from state and recalculate them if necessary
    const searchUrlScores = await State.getAsync("searchUrlScores")
    const updateInterval =
        1000 * (await config.get("searchurlscoreupdateinterval"))
    if (
        searchUrlScores.lastUpdated < 0 ||
        Date.now() - searchUrlScores.lastUpdated > updateInterval
    ) {
        updateSearchUrlScores() // Update scores in background
    }
    return searchUrlScores.scores
}

export function searchUrlMap(query = ""): Map<string, string> {
    // Return searchUrls as a Map of name-URL pairs
    const suconf = config.get("searchurls")
    const searchUrls = new Map<string, string>()
    for (const prop of Object.keys(suconf)) {
        if (prop.startsWith(query)) {
            searchUrls.set(prop, suconf[prop])
        }
    }
    return searchUrls
}

export async function getSearchUrls(query: string): Promise<HistoryItem[]> {
    // Find matching searchUrls and sort by frecency
    const searchScore = config.get("searchurlweight")
    const searchUrlScores = await getSearchUrlScores()
    const searchUrls = searchUrlMap(query)
    const items = Array.from(
        searchUrls,
        ([name, url]) =>
            new HistoryItem(
                name,
                url,
                HistoryItemType.SearchUrl,
                searchScore + (searchUrlScores.get(name) ?? 0),
            ),
    )
    items.sort((a, b) => b.score - a.score)
    return items
}

async function frecency(item: browser.history.HistoryItem) {
    // Calculate exponential decay frecency score for page - if frecency is
    // turned off, just return number of visits
    const halflife = config.get("frecencyhalflife")
    if (halflife <= 0) {
        return item.visitCount
    }
    const lambda = -Math.log(2) / (halflife * 86400000)
    const visits = await browserBg.history.getVisits({ url: item.url })
    const now = Date.now()
    const visitScores = visits.map(v => Math.exp(lambda * (now - v.visitTime)))
    return 2 * visitScores.reduce((a, b) => a + b, 0)
}

export async function getHistory(query: string): Promise<HistoryItem[]> {
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

    const history_entries = await Promise.all(
        history.map(
            async h =>
                new HistoryItem(
                    h.title,
                    h.url,
                    HistoryItemType.History,
                    await frecency(h),
                ),
        ),
    )

    history_entries.sort((a, b) => b.score - a.score)

    return history_entries
}

export async function getTopSites(nSearchUrls = 0): Promise<HistoryItem[]> {
    const entries = (await getSearchUrls("")).slice(0, nSearchUrls)
    const topsites = (await browserBg.topSites.get()).filter(
        page => page.url !== newtaburl(),
    )
    topsites.forEach(site => {
        entries.push(
            new HistoryItem(site.title, site.url, HistoryItemType.TopSite),
        )
    })
    return entries
}

export async function getCombinedHistoryBmarks(
    query: string,
    nSearchUrls = 0,
): Promise<HistoryItem[]> {
    const [history, bookmarks, searchUrls] = await Promise.all([
        getHistory(query),
        getBookmarks(query),
        getSearchUrls(query),
    ])

    // Join records by URL, using the title from bookmarks by preference.
    const combinedMap = new Map<string, any>(
        bookmarks.map(bmark => [bmark.url, bmark]),
    )
    history.forEach(page => {
        if (combinedMap.has(page.url)) {
            combinedMap.get(page.url).score += page.score
        } else {
            combinedMap.set(page.url, page)
        }
    })
    searchUrls.slice(0, nSearchUrls).forEach(su => {
        combinedMap.set(su.url, su)
    })

    return Array.from(combinedMap.values()).sort((a, b) => b.score - a.score)
}

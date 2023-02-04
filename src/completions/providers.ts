import * as config from "@src/lib/config"
import { browserBg } from "@src/lib/webext"

export enum HistoryItemType {
    History,
    Bmark,
    SearchUrl,
    TopSite,
}

export class HistoryItem {
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

export async function getSearchUrls(query: string): Promise<HistoryItem[]> {
    const suconf = config.get("searchurls")
    const searchScore = config.get("searchurlweight")

    const searchUrls = []
    for (const prop in suconf) {
        if (
            Object.prototype.hasOwnProperty.call(suconf, prop) &&
            prop.startsWith(query)
        ) {
            const url = suconf[prop]
            searchUrls.push(
                new HistoryItem(
                    prop,
                    url,
                    HistoryItemType.SearchUrl,
                    searchScore,
                ),
            )
        }
    }
    // Sort urls with equal score alphabetically
    searchUrls.sort((a, b) => (a.title > b.title ? 1 : -1))
    return searchUrls
}

async function frecency(item: browser.history.HistoryItem) {
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

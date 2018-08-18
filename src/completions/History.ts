import * as Completions from "../completions"
import * as config from "../config"
import { browserBg } from "../lib/webext"

class HistoryCompletionOption extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []

    constructor(public value: string, page: browser.history.HistoryItem) {
        super()
        if (!page.title) {
            page.title = new URL(page.url).host
        }

        // Push properties we want to fuzmatch on
        this.fuseKeys.push(page.title, page.url) // weight by page.visitCount

        // Create HTMLElement
        // need to download favicon
        const favIconUrl = Completions.DEFAULT_FAVICON
        // const favIconUrl = tab.favIconUrl ? tab.favIconUrl : DEFAULT_FAVICON
        this.html = html`<tr class="HistoryCompletionOption option">
            <td class="prefix">${"".padEnd(2)}</td>
            <td class="icon"></td>
            <td class="title">${page.title}</td>
            <td class="content"><a class="url" target="_blank" href=${
                page.url
            }>${page.url}</a></td>
        </tr>`
    }
}

export class HistoryCompletionSource extends Completions.CompletionSourceFuse {
    public options: HistoryCompletionOption[]

    constructor(private _parent) {
        super(
            ["open", "tabopen", "winopen"],
            "HistoryCompletionSource",
            "History",
        )

        this._parent.appendChild(this.node)
    }

    public async filter(exstr: string) {
        this.lastExstr = exstr
        let [prefix, query] = this.splitOnPrefix(exstr)
        let options = ""

        // Hide self and stop if prefixes don't match
        if (prefix) {
            // Show self if prefix and currently hidden
            if (this.state === "hidden") {
                this.state = "normal"
            }
        } else {
            this.state = "hidden"
            return
        }

        // Ignoring command-specific arguments
        // It's terrible but it's ok because it's just a stopgap until an actual commandline-parsing API is implemented
        if (prefix == "tabopen ") {
            if (query.startsWith("-c")) {
                let args = query.split(" ")
                options = args.slice(0, 2).join(" ")
                query = args.slice(2).join(" ")
            }
            if (query.startsWith("-b")) {
                let args = query.split(" ")
                options = args.slice(0, 1).join(" ")
                query = args.slice(1).join(" ")
            }
        } else if (prefix == "winopen ") {
            if (query.startsWith("-private")) {
                options = "-private"
                query = query.substring(options.length)
            }
        }
        options += options ? " " : ""

        this.completion = undefined
        this.options = (await this.scoreOptions(query, 10)).map(
            page => new HistoryCompletionOption(options + page.url, page),
        )

        this.updateChain()
    }

    updateChain() {
        // Options are pre-trimmed to the right length.
        this.options.forEach(option => (option.state = "normal"))

        // Call concrete class
        this.updateDisplay()
    }

    onInput() {}

    private frecency(item: browser.history.HistoryItem) {
        // Doesn't actually care about recency yet.
        return item.visitCount * -1
    }

    private async scoreOptions(query: string, n: number) {
        const newtab = browser.runtime.getManifest()["chrome_url_overrides"]
            .newtab
        const newtaburl = browser.extension.getURL(newtab)
        if (!query) {
            return (await browserBg.topSites.get())
                .filter(page => page.url !== newtaburl)
                .slice(0, n)
        } else {
            // Search history, dedupe and sort by frecency
            let history = await browserBg.history.search({
                text: query,
                maxResults: Number(config.get("historyresults")),
                startTime: 0,
            })

            // Remove entries with duplicate URLs
            const dedupe = new Map()
            for (const page of history) {
                if (page.url !== newtaburl) {
                    if (dedupe.has(page.url)) {
                        if (
                            dedupe.get(page.url).title.length <
                            page.title.length
                        ) {
                            dedupe.set(page.url, page)
                        }
                    } else {
                        dedupe.set(page.url, page)
                    }
                }
            }
            history = [...dedupe.values()]

            history.sort((a, b) => this.frecency(a) - this.frecency(b))

            return history.slice(0, n)
        }
    }
}

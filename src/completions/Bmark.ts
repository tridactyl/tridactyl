import { browserBg } from "../lib/webext"
import * as Completions from "../completions"

class BmarkCompletionOption extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []

    constructor(
        public value: string,
        bmark: browser.bookmarks.BookmarkTreeNode,
    ) {
        super()
        if (!bmark.title) {
            bmark.title = new URL(bmark.url).host
        }

        // Push properties we want to fuzmatch on
        this.fuseKeys.push(bmark.title, bmark.url)

        // Create HTMLElement
        // need to download favicon
        const favIconUrl = Completions.DEFAULT_FAVICON
        // const favIconUrl = tab.favIconUrl ? tab.favIconUrl : DEFAULT_FAVICON
        this.html = html`<tr class="BmarkCompletionOption option">
            <td class="prefix">${"".padEnd(2)}</td>
            <td class="icon"></td>
            <td class="title">${bmark.title}</td>
            <td class="content"><a class="url" target="_blank" href=${
                bmark.url
            }>${bmark.url}</a></td>
        </tr>`
    }
}

export class BmarkCompletionSource extends Completions.CompletionSourceFuse {
    public options: BmarkCompletionOption[]

    constructor(private _parent) {
        super(["bmarks"], "BmarkCompletionSource", "Bookmarks")

        this._parent.appendChild(this.node)
    }

    public async filter(exstr: string) {
        this.lastExstr = exstr
        const [prefix, query] = this.splitOnPrefix(exstr)

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

        this.completion = undefined
        this.options = (await this.scoreOptions(query, 10)).map(
            page => new BmarkCompletionOption(page.url, page),
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

    private async scoreOptions(query: string, n: number) {
        // Search bookmarks, dedupe and sort by frecency
        let bookmarks = await browserBg.bookmarks.search({ query })
        bookmarks = bookmarks.filter(b => {
            try {
                return new URL(b.url)
            } catch (e) {
                return false
            }
        })

        bookmarks.sort((a, b) => b.dateAdded - a.dateAdded)

        return bookmarks.slice(0, n)
    }

    select(option: Completions.CompletionOption) {
        if (this.lastExstr !== undefined && option !== undefined) {
            this.completion = "open " + option.value
            option.state = "focused"
            this.lastFocused = option
        } else {
            throw new Error("lastExstr and option must be defined!")
        }
    }
}

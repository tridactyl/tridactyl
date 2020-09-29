import * as Completions from "@src/completions"
import * as providers from "@src/completions/providers"

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

        this.html = html`<tr class="BmarkCompletionOption option">
            <td class="prefix">${"".padEnd(2)}</td>
            <td class="title">${bmark.title}</td>
            <td class="content">
                <a class="url" target="_blank" href=${bmark.url}
                    >${bmark.url}</a
                >
            </td>
        </tr>`
    }
}

export class BmarkCompletionSource extends Completions.CompletionSourceFuse {
    public options: BmarkCompletionOption[]
    public defaultCompletion: string

    constructor(private _parent) {
        super(["bmarks"], "BmarkCompletionSource", "Bookmarks")

        this._parent.appendChild(this.node)
    }

    public async filter(exstr: string) {
        this.lastExstr = exstr
        let [prefix, query] = this.splitOnPrefix(exstr)
        let option = ""

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

        if (query.startsWith("-t ")) {
            option = "-t "
            query = query.slice(3)
        }
        if (query.startsWith("-c")) {
            const args = query.split(" ")
            option += args.slice(0, 2).join(" ")
            option += " "
            query = args.slice(2).join(" ")
        }

        this.completion = undefined
        this.options = (await providers.getBookmarks(query))
            .slice(0, 10)
            .map(page => new BmarkCompletionOption(option + page.url, page))

        return this.updateChain()
    }

    updateChain() {
        // Options are pre-trimmed to the right length.
        this.options.forEach(option => (option.state = "normal"))

        if (this.completion === undefined && this.lastExstr !== undefined && this.options.length != 0) {
            this.defaultCompletion = "bmarks " + this.options[0].value
        }

        // Call concrete class
        return this.updateDisplay()
    }

    select(option: Completions.CompletionOption) {
        this.defaultCompletion = undefined
        if (this.lastExstr !== undefined && option !== undefined) {
            this.completion = "bmarks " + option.value
            option.state = "focused"
            this.lastFocused = option
        } else {
            throw new Error("lastExstr and option must be defined!")
        }
    }
}

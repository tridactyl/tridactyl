import * as Completions from "@src/completions"
import * as config from "@src/lib/config"
import * as providers from "@src/completions/providers"

class HistoryCompletionOption
    extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []

    constructor(page: any, options: string) {
        super()
        if (!page.title) {
            page.title = new URL(page.url).host
        }

        this.value = page.search ? options + page.title : options + page.url

        let preplain = page.bmark ? "B" : ""
        preplain += page.search ? "S" : ""
        let pre = preplain
        if (config.get("completions", "Tab", "statusstylepretty") === "true") {
            pre = page.bmark ? "\u2B50" : ""
            pre += page.search ? "\u{1F50D}" : ""
        }

        // Push properties we want to fuzmatch on
        this.fuseKeys.push(preplain, page.title, page.url) // weight by page.visitCount

        // Create HTMLElement
        this.html = html`<tr class="HistoryCompletionOption option">
            <td class="prefix">${pre}</td>
            <td class="prefixplain" hidden>${preplain}</td>
            <td class="title">${page.title}</td>
            <td class="content">
                ${page.search ? "Search " : ""}
                <a class="url" target="_blank" href=${page.url}>${page.url}</a>
            </td>
        </tr>`
    }
}

export class HistoryCompletionSource extends Completions.CompletionSourceFuse {
    static readonly DEFAULT_SECTION_HEADER = "History and bookmarks"
    public options: Completions.CompletionOptionFuse[]

    constructor(private _parent) {
        super(
            ["open", "tabopen", "winopen"],
            "HistoryCompletionSource",
            HistoryCompletionSource.DEFAULT_SECTION_HEADER,
        )

        this._parent.appendChild(this.node)
    }

    public async filter(exstr: string) {
        const prevStr = this.lastExstr
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

        const headerPostfix = []

        // Ignoring command-specific arguments
        // It's terrible but it's ok because it's just a stopgap until an actual commandline-parsing API is implemented
        if (prefix === "tabopen") {
            if (query.startsWith("-c ")) {
                const args = query.split(" ")
                if (args.length > 2) {
                    options = args.slice(0, 2).join(" ")
                    headerPostfix.push("container: " + args[1])
                }
            }
            if (query.startsWith("-b ")) {
                const args = query.split(" ")
                options = args.slice(0, 1).join(" ")
                headerPostfix.push("background tab")
            }
        } else if (prefix === "winopen" && query.startsWith("-private ")) {
            options = "-private"
            headerPostfix.push("private window")
        }
        options += options ? " " : ""
        query = query.substring(options.length)

        this.updateSectionHeader(
            HistoryCompletionSource.DEFAULT_SECTION_HEADER,
            headerPostfix,
        )
        const tokens = query.split(" ")
        if (tokens.length > 1 || query.endsWith(" ")) {
            const match = (await providers.getSearchUrls(tokens[0])).find(
                su => su.title === tokens[0],
            )
            if (match !== undefined) {
                query = tokens.slice(1).join(" ")
                this.updateSectionHeader("Search " + match.title, headerPostfix)
                // Actual query sent to browser needs to be space separated
                // list of tokens, otherwise partial matches won't be found
                query = match.url.split("%s").join(" ") + " " + query
            }
        }

        // Options are pre-trimmed to the right length.
        // Typescript throws an error here - further investigation is probably warranted
        this.options = (
            (await this.scoreOptions(
                query,
                config.get("historyresults"),
            )) as any
        ).map(page => new HistoryCompletionOption(page, options))

        // Deselect any selected, but remember what they were.
        const lastFocused = this.lastFocused
        this.deselect()

        // Set initial state to normal, unless the option was selected a moment
        // ago, then reselect it so that users don't lose their selections.
        this.options.forEach(option => (option.state = "normal"))
        for (const option of this.options) {
            if (
                lastFocused !== undefined &&
                lastFocused.value === option.value &&
                prevStr.length <= exstr.length
            ) {
                this.select(option)
                break
            }
        }

        return this.updateDisplay()
    }

    // We don't need this inherited function
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    updateChain() {}

    private async scoreOptions(query: string, n: number) {
        if (!query || config.get("historyresults") === 0) {
            return (await providers.getTopSites()).slice(0, n)
        } else {
            return (await providers.getCombinedHistoryBmarks(query)).slice(0, n)
        }
    }

    private updateSectionHeader(newTitle: string, postfix: string[]) {
        if (postfix.length > 0) {
            newTitle += " (" + postfix.join(", ") + ")"
        }
        const headerNode = this.node.firstElementChild
        const oldTitle = headerNode.innerHTML
        if (newTitle !== oldTitle) {
            headerNode.innerHTML = newTitle
        }
    }
}

import * as Completions from "@src/completions"
import * as providers from "@src/completions/providers"
import * as config from "@src/lib/config"

class BmarkCompletionOption
    extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []

    constructor(
        public value: string,
        bmark: providers.Bookmark,
    ) {
        super()
        if (!bmark.title) {
            bmark.title = new URL(bmark.url).host
        }

        // Push properties we want to fuzmatch on
        this.fuseKeys.push(bmark.path, bmark.title, bmark.url)

        this.html = html`<tr class="BmarkCompletionOption option">
            <td class="prefix">${"".padEnd(2)}</td>
            <td class="title">${bmark.path}${bmark.title}</td>
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
    private shouldSetStateFromScore = true

    constructor(private _parent) {
        super(["bmarks"], "BmarkCompletionSource", "Bookmarks")

        this._parent.appendChild(this.node)
        this.sortScoredOptions = true
        this.shouldSetStateFromScore =
            config.get("completions", "Bmark", "autoselect") === "true"
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

        this.lastExstr = [prefix, query].join(" ")
        return this.updateChain()
    }

    setStateFromScore(scoredOpts: Completions.ScoredOption[]) {
        super.setStateFromScore(scoredOpts, this.shouldSetStateFromScore)
    }

    updateChain() {
        const query = this.splitOnPrefix(this.lastExstr)[1]

        if (query && query.trim().length > 0) {
            this.setStateFromScore(this.scoredOptions(query))
        } else {
            this.options.forEach(option => (option.state = "normal"))
        }

        // Call concrete class
        return this.updateDisplay()
    }

    select(option: Completions.CompletionOption) {
        if (this.lastExstr !== undefined && option !== undefined) {
            this.completion = "bmarks " + option.value
            option.state = "focused"
            this.lastFocused = option
        } else {
            throw new Error("lastExstr and option must be defined!")
        }
    }
}

export class BookmarkFolderCompletionSource extends Completions.CompletionSourceFuse {
    constructor() {
        super(["bmark"], "BookmarkFolderCompletionSource", "Bookmark Folders", {
            trailingSpace: false,
        })
    }

    async onInput(exstr: string) {
        const [_command, _url, path] = this.parseArgs(exstr)
        if (path == undefined) {
            this.options = undefined
            return
        }
        this.options = (await providers.getBookmarkFolders(path))
            .slice(0, 10)
            .map(path => new BookmarkFolderCompletionOption(path))
    }

    splitOnPrefix(exstr: string): string[] {
        const [command, url, path] = this.parseArgs(exstr)
        return [`${command} ${url}`, path]
    }

    private parseArgs(exstr: string): string[] {
        const [command, args] = super.splitOnPrefix(exstr)
        if (!args) {
            return [command]
        }
        const spaceIndex = args.search(/\s+/)
        const url = args.slice(0, spaceIndex)
        if (spaceIndex == -1) {
            return [command, url]
        }
        const path = args.slice(spaceIndex + 1)
        return [command, url, path]
    }
}

class BookmarkFolderCompletionOption
    extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    fuseKeys = []

    constructor(public value: string) {
        super()
        this.fuseKeys.push(value)
        this.html = html`<tr class="BookmarkFolderCompletionOption option">
            <td class="prefix">${"".padEnd(2)}</td>
            <td class="title">${value}</td>
        </tr>`
    }
}

import * as Messaging from "@src/lib/messaging"
import * as Completions from "@src/completions"
import * as config from "@src/lib/config"

class RssCompletionOption
    extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []

    constructor(public url, public title, public type) {
        super()
        this.value = `${url} ${type} ${title}`
        this.fuseKeys.push(url)
        this.fuseKeys.push(title)

        this.html = html`<tr class="RssCompletionOption option">
            <td class="title">${title}</td>
            <td class="content">
                <a class="url" target="_blank" href=${url}>${url}</a>
            </td>
            <td class="type">${type}</td>
        </tr>`
    }
}

export class RssCompletionSource extends Completions.CompletionSourceFuse {
    public options: RssCompletionOption[] = []
    private shouldSetStateFromScore = true

    constructor(private _parent) {
        super(["rssexec"], "RssCompletionSource", "Feeds")

        this.shouldSetStateFromScore =
            config.get("completions", "Rss", "autoselect") === "true"
        this._parent.appendChild(this.node)
    }

    setStateFromScore(scoredOpts: Completions.ScoredOption[]) {
        super.setStateFromScore(scoredOpts, this.shouldSetStateFromScore)
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars-experimental
    /* override*/ async updateOptions(command, rest) {
        if (this.options.length < 1) {
            this.options = (
                await Messaging.messageOwnTab(
                    "excmd_content",
                    "getRssLinks",
                    [],
                )
            ).map(link => {
                const opt = new RssCompletionOption(
                    link.url,
                    link.title,
                    link.type,
                )
                opt.state = "normal"
                return opt
            })
        }
    }
}

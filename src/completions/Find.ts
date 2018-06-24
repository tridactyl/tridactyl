import { browserBg, activeTabId } from "../lib/webext"
import * as Messaging from "../messaging"
import * as Completions from "../completions"
import { executeWithoutCommandLine } from "../commandline_content"
import * as config from "../config"

class FindCompletionOption extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []
    constructor(m) {
        super()
        this.value = m.rangeData.text
        this.fuseKeys.push(this.value)

        let contextLength = 4
        // Create HTMLElement
        this.html = html`<tr class="FindCompletionOption option">
            <td class="content">${m.precontext}<span class="match">${
            this.value
        }</span>${m.postcontext}</td>
        </tr>`
    }
}

export class FindCompletionSource extends Completions.CompletionSourceFuse {
    public options: FindCompletionOption[]
    public prevCompletion = null
    public completionCount = 0

    constructor(private _parent) {
        super(["find"], "FindCompletionSource", "Matches")

        this.updateOptions()
        this._parent.appendChild(this.node)
    }

    async onInput(exstr) {
        let id = this.completionCount++
        // If there's already a promise being executed, wait for it to finish
        await this.prevCompletion
        // Since we might have awaited for this.prevCompletion, we don't have a guarantee we're the last completion the user asked for anymore
        if (id == this.completionCount - 1) {
            // If we are the last completion
            this.prevCompletion = this.updateOptions(exstr)
            await this.prevCompletion
        }
    }

    private async updateOptions(exstr?: string) {
        if (!exstr) return
        let query = exstr.substring(exstr.trim().indexOf(" ") + 1)
        if (!query || query == exstr) return
        let findresults = await config.getAsync("findresults")
        if (findresults === 0) return
        let findcase = await config.getAsync("findcase")
        let caseSensitive =
            findcase == "sensitive" ||
            (findcase == "smart" && query.search(/[A-Z]/) >= 0)

        this.lastExstr = exstr
        let tabId = await activeTabId()
        let findings = browserBg.find.find(query, {
            tabId,
            caseSensitive,
            includeRangeData: true,
        })
        findings = await findings
        if (findings.count > 0) {
            if (findresults != -1 && findresults < findings.count)
                findings.count = findresults
            let len = await config.getAsync("findcontextlen")
            let matches = await Messaging.messageTab(
                tabId,
                "finding_content",
                "getMatches",
                [findings, len],
            )
            this.options = matches.map(m => new FindCompletionOption(m))
            this.updateChain(exstr, this.options)
        } else {
        }
    }

    //  Overriding this function is important, the default one has a tendency to hide options when you don't expect it
    setStateFromScore(scoredOpts, autoselect) {
        this.options.forEach(o => (o.state = "normal"))
    }
}

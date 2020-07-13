import { browserBg } from "@src/lib/webext"
import * as Completions from "../completions"
import * as config from "@src/lib/config"
import * as finding from "@src/content/finding"

class FindCompletionOption extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []
    constructor(m, reverse = false) {
        super()
        this.value = m.id
        // (reverse ? "-? " : "") + ("-: " + m.index) + " " + m.rangeData.text
        this.fuseKeys.push(m.rangeData.text)

        // Create HTMLElement
        this.html = html`<tr class="FindCompletionOption option">
            <td class="content">
                ${m.precontext}<span class="match">${m.rangeData.text}</span
                >${m.postcontext}
            </td>
        </tr>`
    }
}

export class FindCompletionSource extends Completions.CompletionSourceFuse {
    public options: FindCompletionOption[]
    public prevCompletion = null
    public completionCount = 0
    private startingPosition = 0

    constructor(private _parent) {
        super(["find "], "FindCompletionSource", "Matches")

        this.startingPosition = window.pageYOffset
        this._parent.appendChild(this.node)
    }

    async onInput(exstr) {
        const id = this.completionCount++
        // If there's already a promise being executed, wait for it to finish
        await this.prevCompletion
        // Since we might have awaited for this.prevCompletion, we don't have a guarantee we're the last completion the user asked for anymore
        if (id === this.completionCount - 1) {
            // If we are the last completion
            this.prevCompletion = this.updateOptions(exstr)
            await this.prevCompletion
        }
    }

    //  Overriding this function is important, the default one has a tendency to hide options when you don't expect it
    setStateFromScore(scoredOpts, autoselect) {
        this.options.forEach(o => (o.state = "normal"))
    }

    select(option: FindCompletionOption) {
        if (this.lastExstr !== undefined && option !== undefined) {
            this.completion = "findjumpto " + option.value
            option.state = "focused"
            this.lastFocused = option
        } else {
            throw new Error("lastExstr and option must be defined!")
        }
    }

    private async updateOptions(exstr?: string) {
        if (!exstr) return

        // Flag parsing because -? should reverse completions
        const tokens = exstr.split(" ")
        const flagpos = tokens.indexOf("-?")
        const reverse = flagpos >= 0
        if (reverse) {
            tokens.splice(flagpos, 1)
        }

        const query = tokens.slice(1).join(" ")
        const minincsearchlen = await config.getAsync("minincsearchlen")
        // No point if continuing if the user hasn't started searching yet
        if (query.length < minincsearchlen) return

        let findresults = config.get("findresults")
        const incsearch = config.get("incsearch") === "true"
        if (findresults === 0 && !incsearch) return

        let incsearchonly = false
        if (findresults === 0) {
            findresults = 1
            incsearchonly = true
        }

        const findings = await browserBg.find.find(query, {
            includeRectData: true,
            includeRangeData: true,
        })
        // TODO: don't do this twice / thrice
        await finding.jumpToMatch(query, false)
        const matches = []

        for (let i = 0; i < findings.count; i++) {
            matches.push({
                rectData: findings.rectData[i],
                rangeData: findings.rangeData[i],
                id: i + 1,
                precontext: "",
                postcontext: "",
            })
            // pre, post context todo - see commit e878b93fd
        }

        // If the search was successful
        if (findings.count > 0) {
            // Get match context
            // const len = await config.getAsync("findcontextlen")

            if (incsearch) finding.jumpToMatch(query, false)

            if (!incsearchonly) {
                this.options = matches.map(
                    m => new FindCompletionOption(m, reverse),
                )
                this.updateChain(exstr, this.options)
            }
        }
    }

}

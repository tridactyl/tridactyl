import { activeTabId } from "@src/lib/webext"
import * as Messaging from "@src/lib/messaging"
import * as Completions from "../completions"
import * as config from "@src/lib/config"

class FindCompletionOption
    extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []
    constructor(m, reverse = false) {
        super()
        this.value =
            (reverse ? "-? " : "") + ("-: " + m.index) + " " + m.rangeData.text
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

    constructor(private _parent) {
        super(["find "], "FindCompletionSource", "Matches")

        this._parent.appendChild(this.node)
    }

    async filter(exstr) {
        const id = this.completionCount++
        // If there's already a promise being executed, wait for it to finish
        await this.prevCompletion
        // Since we might have awaited for this.prevCompletion, we don't have a guarantee we're the last completion the user asked for anymore
        if (id === this.completionCount - 1) {
            // If we are the last completion
            this.prevCompletion = this.handleCommand(exstr)
            await this.prevCompletion
        }
        return this.updateChain()
    }

    //  Overriding this function is important, the default one has a tendency to hide options when you don't expect it
    setStateFromScore() {
        this.options.forEach(o => (o.state = "normal"))
    }

    /* override*/ protected async updateOptions(command, rest) {
        // Flag parsing because -? should reverse completions
        const tokens = rest.split(" ")
        const flagpos = tokens.indexOf("-?")
        const reverse = flagpos >= 0
        if (reverse) {
            tokens.splice(flagpos, 1)
        }

        const query = tokens.join(" ")
        const minincsearchlen = await config.getAsync("minincsearchlen")
        // No point if continuing if the user hasn't started searching yet
        if (query.length < minincsearchlen) return

        let findresults = await config.getAsync("findresults")
        const incsearch = (await config.getAsync("incsearch")) === "true"
        if (findresults === 0 && !incsearch) return

        let incsearchonly = false
        if (findresults === 0) {
            findresults = 1
            incsearchonly = true
        }

        // Note: the use of activeTabId here might break completions if the user starts searching for a pattern in a really big page and then switches to another tab.
        // Getting the tabId should probably be done in the constructor but you can't have async constructors.
        const tabId = await activeTabId()
        const findings = await Messaging.messageTab(
            tabId,
            "finding_content",
            "find",
            [query, findresults, reverse],
        )

        // If the search was successful
        if (findings.length > 0) {
            // Get match context
            const len = await config.getAsync("findcontextlen")
            const matches = await Messaging.messageTab(
                tabId,
                "finding_content",
                "getMatches",
                [findings, len],
            )

            if (incsearch)
                Messaging.messageTab(tabId, "finding_content", "jumpToMatch", [
                    query,
                    false,
                    0,
                ])

            if (!incsearchonly) {
                this.options = matches.map(
                    m => new FindCompletionOption(m, reverse),
                )
            }
        }
    }
}

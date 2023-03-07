import * as Completions from "@src/completions"
import { potentialRules, metaRules } from "@src/lib/css_util"

class GuisetCompletionOption
    extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []

    constructor(public value: string, displayValue: string) {
        super()
        this.fuseKeys.push(value)

        this.html = html`<tr class="GuisetCompletionOption option">
            <td class="value">${displayValue}</td>
        </tr>`
    }
}

export class GuisetCompletionSource extends Completions.CompletionSourceFuse {
    public options: GuisetCompletionOption[]

    constructor(private _parent) {
        super(["guiset", "guiset_quiet"], "GuisetCompletionSource", "Guiset")

        this._parent.appendChild(this.node)
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars-experimental
    /* override*/ async updateOptions(command, rest) {
        this.completion = undefined

        let ruleName = ""
        let subRule = ""
        if (rest) {
            const args = rest.trim().split(" ")
            ruleName = args[0] || ""
            subRule = args[1] || ""
        }
        this.options = []
        if (metaRules[ruleName]) {
            this.options = this.options.concat(
                Object.keys(metaRules[ruleName])
                    .filter(s => s.startsWith(subRule))
                    .map(
                        s => new GuisetCompletionOption(`${ruleName} ${s}`, s),
                    ),
            )
        }
        if (potentialRules[ruleName]) {
            this.options = this.options.concat(
                Object.keys(potentialRules[ruleName].options)
                    .filter(s => s.startsWith(subRule))
                    .map(
                        s => new GuisetCompletionOption(`${ruleName} ${s}`, s),
                    ),
            )
        }
        if (this.options.length === 0) {
            this.options = Object.keys(metaRules)
                .concat(Object.keys(potentialRules))
                .filter(s => s.startsWith(ruleName))
                .map(s => new GuisetCompletionOption(s, s))
        }
    }
}

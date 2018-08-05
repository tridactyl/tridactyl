import * as Completions from "../completions"
import * as Metadata from "../.metadata.generated"

class ExcmdCompletionOption extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []
    constructor(
        public value: string,
        public ttype: string,
        public documentation: string,
    ) {
        super()
        this.fuseKeys.push(this.value)

        // Create HTMLElement
        this.html = html`<tr class="ExcmdCompletionOption option">
            <td class="excmd">${value}</td>
            <td class="type">${ttype}</td>
            <td class="documentation">${documentation}</td>
        </tr>`
    }
}

export class ExcmdCompletionSource extends Completions.CompletionSourceFuse {
    public options: ExcmdCompletionOption[]

    constructor(private _parent) {
        super([], "ExcmdCompletionSource", "Excmds")

        this.updateOptions()
        this._parent.appendChild(this.node)
    }

    async onInput(exstr) {
        await this.updateOptions(exstr)
    }

    updateChain(exstr = this.lastExstr, options = this.options) {
        if (this.options.length > 0) this.state = "normal"
        else this.state = "hidden"

        this.updateDisplay()
    }

    private async updateOptions(exstr?: string) {
        if (!exstr) exstr = ""
        this.lastExstr = exstr
        let fns = Metadata.everything["src/excmds.ts"]
        this.options = Object.keys(fns)
            .filter(f => f.startsWith(exstr))
            .map(f => new ExcmdCompletionOption(f, fns[f].type, fns[f].doc))
        this.options.forEach(o => (o.state = "normal"))
        this.updateChain()
    }

    select(option: ExcmdCompletionOption) {
        this.completion = option.value
        option.state = "focused"
        this.lastFocused = option
    }

    setStateFromScore(scoredOpts: Completions.ScoredOption[]) {
        super.setStateFromScore(scoredOpts, false)
    }
}

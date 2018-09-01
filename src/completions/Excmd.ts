import * as Completions from "../completions"
import { typeToSimpleString } from "../metadata"
import * as Metadata from "../.metadata.generated"
import state from "../state"
import * as config from "../config"
import * as aliases from "../aliases"

class ExcmdCompletionOption extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []
    constructor(
        public value: string,
        public ttype: string = "",
        public documentation: string = "",
    ) {
        super()
        this.fuseKeys.push(this.value)

        // Create HTMLElement
        this.html = html`<tr class="ExcmdCompletionOption option">
            <td class="excmd">${value}</td>
            <td class="documentation">${documentation}</td>
        </tr>`
    }
    // <td class="type">${ttype}</td>
}

export class ExcmdCompletionSource extends Completions.CompletionSourceFuse {
    public options: ExcmdCompletionOption[]

    constructor(private _parent) {
        super([], "ExcmdCompletionSource", "ex commands")

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
        let fns = Metadata.everything["src/excmds.ts"].functions
        this.options = (await this.scoreOptions(
            Object.keys(fns).filter(f => f.startsWith(exstr)),
        )).map(f => {
            let t = ""
            if (fns[f].type) t = typeToSimpleString(fns[f].type)
            return new ExcmdCompletionOption(f, t, fns[f].doc)
        })

        let exaliases = config.get("exaliases")
        for (let alias of Object.keys(exaliases).filter(a =>
            a.startsWith(exstr),
        )) {
            let cmd = aliases.expandExstr(alias)
            if (fns[cmd]) {
                this.options = this.options.concat(
                    new ExcmdCompletionOption(
                        alias,
                        fns[cmd].type ? typeToSimpleString(fns[cmd].type) : "",
                        `Alias for \`${cmd}\`. ${fns[cmd].doc}`,
                    ),
                )
            } else {
                // This can happen when the alias is a composite command or a command with arguments. We can't display type or doc because we don't know what parameter the alias takes or what it does.
                this.options = this.options.concat(
                    new ExcmdCompletionOption(
                        alias,
                        "",
                        `Alias for \`${cmd}\`.`,
                    ),
                )
            }
        }

        this.options.forEach(o => (o.state = "normal"))
        this.updateChain()
    }

    private async scoreOptions(exstrs: string[]) {
        return exstrs.sort()

        // Too slow with large profiles
        // let histpos = state.cmdHistory.map(s => s.split(" ")[0]).reverse()
        // return exstrs.sort((a, b) => {
        //     let posa = histpos.findIndex(x => x == a)
        //     let posb = histpos.findIndex(x => x == b)
        //     // If two ex commands have the same position, sort lexically
        //     if (posa == posb) return a < b ? -1 : 1
        //     // If they aren't found in the list they get lower priority
        //     if (posa == -1) return 1
        //     if (posb == -1) return -1
        //     // Finally, sort by history position
        //     return posa < posb ? -1 : 1
        // })
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

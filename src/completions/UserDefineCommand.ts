import * as Completions from "@src/completions"
import * as config from "@src/lib/config"

export class UserCompletionOption extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []
    constructor({value, display, fuseKeys}) {
        super()
        this.value = value
        this.display = display
        this.fuseKeys.push(...fuseKeys)
        // Create HTMLElement
        this.html = html`<tr class="UserCompletionOption option">
            <td class="value">${value}</td>
            <td class="display">${display}</td>
        </tr>`
        this.state = 'normal'
    }
}

export class UserCompletionSource extends Completions.CompletionSourceFuse {
    public options: UserCompletionOption[]
    public compFn: (argv: string[], ctx: object) => any
    public context: object
    public lastCmd: string

    constructor(private _parent) {
        super([], "UserCompletionSource", "user completions")

        this.compFn = this.context = this.lastCmd = null
        this.updateOptions()
        this._parent.appendChild(this.node)
    }

    async onInput(exstr) {
        return this.updateOptions(exstr)
    }

    select(option: UserCompletionOption) {
        this.completion = option.value
        option.state = "focused"
        this.lastFocused = option
    }

    setStateFromScore(scoredOpts: Completions.ScoredOption[]) {
        super.setStateFromScore(scoredOpts, false)
    }
    private clearCompletion() {
        this.options = []
        this.prefixes = []
        this.lastCmd = null
    }

    private async updateOptions(exstr = "") {
        this.lastExstr = exstr
        const argv = exstr.trim().split(/\s+/)
        const cmd = argv[0]
        if (!cmd) return this.clearCompletion()
        if (this.lastCmd != cmd) {
            const code = config.get('usercompletions', cmd)
            if (!code) return this.clearCompletion()
            this.compFn = eval(code)
            this.lastCmd = cmd
            this.prefixes = [cmd + ' ']
            this.context = {}
        }
        this.context.exstr = exstr
        let r = this.compFn(argv, this.context)
        if (r && r.then) r = await r
        if (r == undefined) return
        if (!Array.isArray(r)) {
            throw new Error('unknown user completion function')
        }
        this.options = r.map(x => {
            const exstr = `${cmd} ${x}`
            let o
            if (!Array.isArray(x)) o = {
                value: `${cmd} ${x}`,
                display: x,
                fuseKeys: [x]
            }
            else o = {
                value: `${cmd} ${x[0]}`,
                display: x[1],
                fuseKeys: x
            }
            return new UserCompletionOption(o)
        })
    }
}

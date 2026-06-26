import * as Messaging from "@src/lib/messaging"
import * as Completions from "@src/completions"
import * as config from "@src/lib/config"

export class CompletionsCustomOption extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []
    constructor({value, display, fuseKeys}) {
        super()
        this.value = value
        this.display = display
        this.fuseKeys.push(...fuseKeys)
        this.html = html`<tr class="CompletionsCustomOption option">
            <td class="value">${value}</td>
            <td class="display">${display}</td>
        </tr>`
        this.state = 'normal'
    }
}

export class CompletionsCustomSource extends Completions.CompletionSourceFuse {
    public options: UserCompletionOption[]
    public lastCmd: string
    private userOption: object = {
        autoselect: false,
    }

    constructor(private _parent) {
        super([], "CompletionsCustomSource", "completions custom")

        this.lastCmd = null
        this.updateOptions()
        this._parent.appendChild(this.node)
    }

    async onInput(exstr) {
        // TODO: do some debounce
        return this.updateOptions(exstr)
    }

    select(option: CompletionsCustomOption) {
        this.completion = option.value
        option.state = "focused"
        this.lastFocused = option
    }

    setStateFromScore(scoredOpts: Completions.ScoredOption[]) {
        super.setStateFromScore(scoredOpts, this.userOption.autoselect)
    }
    private clearCompletion() {
        if (this.lastCmd == null) return
        Messaging.messageOwnTab(
            "excmd_content",
            "getCompletionsCustom",
            [[''], {}, {}],
        )
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
            if (cmd != 'comp') {
                const code = config.get('completionscustom', cmd)
                if (!code) return this.clearCompletion()
            }
            this.lastCmd = cmd
            this.prefixes = [cmd + ' ']
        }
        const [r, opt] = await Messaging.messageOwnTab(
            "excmd_content",
            "getCompletionsCustom",
            [argv, {exstr}, {
                ...this.userOption, fuseOptions: this.fuseOptions
            }],
        )
        if (opt) {
            this.userOption = opt
            if (opt.fuseOptions) {
                Object.assign(this.fuseOptions, opt.fuseOptions)
            }
            if (opt.prefix) this.prefixes = [opt.prefix]
        }
        if (r == undefined) return
        if (!Array.isArray(r)) {
            throw new Error('unknown user completion format')
        }
        const prefix = this.prefixes[0]
        this.options = r.map(x => {
            let o
            if (!Array.isArray(x)) o = {
                value: prefix + x,
                display: x,
                fuseKeys: [x]
            }
            else o = {
                value: prefix + x[0],
                display: x[1],
                fuseKeys: [x[1]]
            }
            return new CompletionsCustomOption(o)
        })
    }
}

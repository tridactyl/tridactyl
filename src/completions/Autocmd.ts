import * as Messaging from "@src/lib/messaging"
import * as Completions from "@src/completions"
import * as config from "@src/lib/config"

class AutocmdCompletionOption
    extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []

    constructor(public displayValue, public description, public value) {
        super()
        this.fuseKeys.push(value)

        this.html = html`<tr class="AutocmdCompletionOption option">
            <td class="icon" width="4ch"><!-- Nothing here yet --></td>
            <td class="displayValue">${displayValue}</td>
            <td class="description">${description}</td>
        </tr>`
    }
}

export class AutocmdCompletionSource extends Completions.CompletionSourceFuse {
    public options: AutocmdCompletionOption[] = []
    private shouldSetStateFromScore = true

    constructor(private _parent) {
        super(
            ["autocmd", "autocmddelete"],
            "AutocmdCompletionSource",
            "Autocommands",
        )

        this.updateOptions()
        this.shouldSetStateFromScore =
            config.get("completions", "Autocmd", "autoselect") === "true"
        this._parent.appendChild(this.node)
    }

    setStateFromScore(scoredOpts: Completions.ScoredOption[]) {
        super.setStateFromScore(scoredOpts, this.shouldSetStateFromScore)
    }

    onInput(...whatever) {
        return this.updateOptions(...whatever)
    }

    private async updateOptions(exstr = "") {
        this.lastExstr = exstr
        const [prefix, rest] = this.splitOnPrefix(exstr)
        const args = rest ? rest.split(/\s+/) : []

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
        const is_autocmddelete = /del/.test(prefix)
        const filter_defined_autocmds = is_autocmddelete
        const defined_autocmds = config.get("autocmds")
        // Config may contain empty dictionnaries if user deleted all patterns
        // for an autocmd, filter these out
        Object.keys(defined_autocmds).forEach(k => {
            if (Object.keys(defined_autocmds[k]).length == 0) {
                delete defined_autocmds[k]
            }
        })
        if (args.length < 2) {
            const all_autocmds = await Messaging.message(
                "excmd_background",
                "getAutocmdEvents",
            )
            let autocmds_to_suggest: string[]
            if (filter_defined_autocmds) {
                const defined_events = new Set(Object.keys(defined_autocmds))
                autocmds_to_suggest = all_autocmds.filter(s =>
                    defined_events.has(s),
                )
            } else {
                autocmds_to_suggest = all_autocmds
            }
            if (args.length > 0) {
                autocmds_to_suggest = autocmds_to_suggest.filter(s =>
                    s.startsWith(args[0]),
                )
            }
            this.options = autocmds_to_suggest
                .sort((a, b) => a.localeCompare(b))
                .map(event => {
                    let value = event
                    const patterns = Object.keys(defined_autocmds[event] || {})
                    let description: string
                    if (patterns.length == 0) {
                        description = ""
                    } else if (patterns.length == 1) {
                        description = patterns[0]
                        value = `${event} ${description}`
                    } else if (patterns.length > 1) {
                        description = `[${patterns.join(", ")}]`
                    }
                    const opt = new AutocmdCompletionOption(
                        event,
                        description,
                        value,
                    )
                    opt.state = "normal"
                    return opt
                })
        } else if (args.length == 2) {
            const event = args[0]
            const pat = args[1]
            const existing_patterns = Object.entries(defined_autocmds)
                .filter(([e, _]) => !filter_defined_autocmds || e == event)
                .map(([_, v]) => Object.entries(v))
                .flat()
            this.options = existing_patterns
                .filter(([pattern, _]) => pattern.startsWith(pat))
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([pattern, command]) => {
                    // Only show a corresonding command when using
                    // autocmddelete, to help the user find the right command.
                    // It'd be confusing to offer existing command completion
                    // for `autocmd` itself.
                    let description = ""
                    if (is_autocmddelete) {
                        description = command
                    }
                    const opt = new AutocmdCompletionOption(
                        pattern,
                        description,
                        `${event} ${pattern}`,
                    )
                    opt.state = "normal"
                    return opt
                })
        } else {
            this.options = []
        }
        return this.updateChain()
    }
}

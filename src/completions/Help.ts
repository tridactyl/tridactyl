import * as Completions from "@src/completions"
import * as Metadata from "@src/.metadata.generated"
import * as aliases from "@src/lib/aliases"
import * as config from "@src/lib/config"
import state from "@src/state"
import { browserBg } from "@src/lib/webext"
import { typeToString } from "@src/lib/metadata"

class HelpCompletionOption extends Completions.CompletionOptionHTML implements Completions.CompletionOptionFuse {
    public fuseKeys = []

    constructor(
        public value: string,
        doc: string
    ) {
        super()
        this.html = html`<tr class="HelpCompletionOption option">
            <td class="name">${value}</td>
            <td class="doc">${doc}</td>
        </tr>`
    }
}

export class HelpCompletionSource extends Completions.CompletionSourceFuse {
    public options: HelpCompletionOption[]

    constructor(private _parent) {
        super(
            ["help"],
            "HelpCompletionSource",
            "Help",
        )

        this._parent.appendChild(this.node)
    }

    public async filter(exstr: string) {
        this.lastExstr = exstr
        let [prefix, query] = this.splitOnPrefix(exstr)
        let options = ""

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


        let configmd = Metadata.everything["src/lib/config.ts"].classes.default_config
        let fns = Metadata.everything["src/excmds.ts"].functions
        let settings = config.get()
        let exaliases = settings.exaliases
        let bindings = settings.nmaps

        // Settings completion
        this.options = Object.keys(settings)
            .filter(x => x.startsWith(query))
            .map(setting => {
                let doc = ""
                if (configmd[setting]) {
                    doc = configmd[setting].doc.join(" ")
                }
                return new HelpCompletionOption(setting, `Setting. ${doc}`)
            })
        // Excmd completion
            .concat(Object.keys(fns)
                .filter(fn => fn.startsWith(query))
                .map(f => new HelpCompletionOption(f, `Excmd. ${fns[f].doc}`))
            )
        // Alias completion
            .concat(Object.keys(exaliases)
                .filter(alias => alias.startsWith(query))
                .map(alias => {
                    let cmd = aliases.expandExstr(alias)
                    let doc = (fns[cmd] || {}).doc || ""
                    return new HelpCompletionOption(alias, `Alias for \`${cmd}\`. ${doc}`)
                })
            )
        // Bindings completion
            .concat(Object.keys(bindings)
                .filter(binding => binding.startsWith(query))
                .map(binding => new HelpCompletionOption(binding, `Normal mode binding for \`${bindings[binding]}\``)))
            .sort((compopt1, compopt2) => compopt1.value.localeCompare(compopt2.value))
        this.updateChain()
    }

    updateChain() {
        // Options are pre-trimmed to the right length.
        this.options.forEach(option => (option.state = "normal"))

        // Call concrete class
        this.updateDisplay()
    }

    onInput() {}
}

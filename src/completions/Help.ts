import * as Completions from "@src/completions"
import * as Metadata from "@src/.metadata.generated"
import * as aliases from "@src/lib/aliases"
import * as config from "@src/lib/config"
import state from "@src/state"
import { browserBg } from "@src/lib/webext"

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


        let file, default_config, excmds, fns, settings, exaliases, bindings
        if (!(file = Metadata.everything.getFile("src/lib/config.ts"))
            || !(default_config = file.getClass("default_config"))
            || !(excmds = Metadata.everything.getFile("src/excmds.ts"))
            || !(fns = excmds.getFunctions())
            || !(settings = config.get())
            || !(exaliases = settings.exaliases)
            || !(bindings = settings.nmaps))
            return;

        // Settings completion
        this.options = Object.keys(settings)
            .filter(x => x.startsWith(query))
            .map(setting => {
                let member, doc = ""
                if (member = default_config.getMember(setting)) {
                    doc = member.doc
                }
                return new HelpCompletionOption(setting, `Setting. ${doc}`)
            })
        // Excmd completion
            .concat(fns
                .filter(([name, fn]) => !fn.hidden && name.startsWith(query))
                .map(([name, fn]) => new HelpCompletionOption(name, `Excmd. ${fn.doc}`))
            )
        // Alias completion
            .concat(Object.keys(exaliases)
                .filter(alias => alias.startsWith(query))
                .map(alias => {
                    let cmd = aliases.expandExstr(alias)
                    let doc = (excmds.getFunction(cmd) || {}).doc || ""
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

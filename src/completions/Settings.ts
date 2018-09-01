import * as Completions from "../completions"
import * as config from "../config"
import { browserBg } from "../lib/webext"
import * as metadata from "../.metadata.generated"
import { typeToString } from "../metadata"

class SettingsCompletionOption extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []

    constructor(
        public value: string,
        setting: { name: string; value: string; type: string; doc: string },
    ) {
        super()
        this.html = html`<tr class="SettingsCompletionOption option">
            <td class="title">${setting.name}</td>
            <td class="content">${setting.value}</td>
            <td class="type">${setting.type}</td>
            <td class="doc">${setting.doc}</td>
        </tr>`
    }
}

export class SettingsCompletionSource extends Completions.CompletionSourceFuse {
    public options: SettingsCompletionOption[]

    constructor(private _parent) {
        super(["set", "get", "unset"], "SettingsCompletionSource", "Settings")

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

        let configmd =
            metadata.everything["src/config.ts"].classes.default_config
        let settings = config.get()
        this.options = Object.keys(settings)
            .filter(x => x.startsWith(query))
            .sort()
            .map(setting => {
                let doc = ""
                let type = ""
                if (configmd[setting]) {
                    doc = configmd[setting].doc.join(" ")
                    type = typeToString(configmd[setting].type)
                }
                return new SettingsCompletionOption(setting, {
                    name: setting,
                    value: JSON.stringify(settings[setting]),
                    doc: doc,
                    type: type,
                })
            })
        // this.options = [new SettingsCompletionOption("ok", {name: "ok", docs:""})]

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

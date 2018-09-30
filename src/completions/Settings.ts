import * as Completions from "@src/completions"
import * as config from "@src/lib/config"
import { browserBg } from "@src/lib/webext"
import * as metadata from "@src/.metadata.generated"
import { typeToString } from "@src/lib/metadata"

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

    constructor() {
        super(
            ["set", "get", "unset", "seturl", "unseturl"],
            "SettingsCompletionSource",
            "Settings",
        )
        this.node.setAttribute("key", "settings_completion_source")
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

        // Ignoring command-specific arguments
        // It's terrible but it's ok because it's just a stopgap until an actual commandline-parsing API is implemented
        // copy pasting code is fun and good
        if (prefix == "seturl " || prefix == "unseturl ") {
            let args = query.split(" ")
            options = args.slice(0, 1).join(" ")
            query = args.slice(1).join(" ")
        }

        options += options ? " " : ""

        let configmd =
            metadata.everything["src/lib/config.ts"].classes.default_config
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
                return new SettingsCompletionOption(options + setting, {
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

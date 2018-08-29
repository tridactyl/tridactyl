import * as Completions from "../completions"
import * as config from "../config"
import { browserBg } from "../lib/webext"

class SettingsCompletionOption extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []

    constructor(
        public value: string,
        setting: { name: string; value: string; docs: string },
    ) {
        super()
        this.html = html`<tr class="SettingsCompletionOption option">
            <td class="title">${setting.name}</td>
            <td class="content">${setting.value}</td>
        </tr>`
    }
}

export class SettingsCompletionSource extends Completions.CompletionSourceFuse {
    public options: SettingsCompletionOption[]

    constructor(private _parent) {
        super(["set", "get"], "SettingsCompletionSource", "Settings")

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

        let settings = config.get()
        this.options = Object.keys(settings)
            .filter(x => x.startsWith(query))
            .sort()
            .map(
                setting =>
                    new SettingsCompletionOption(setting, {
                        name: setting,
                        value: JSON.stringify(settings[setting]),
                        docs: "",
                    }),
            )
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

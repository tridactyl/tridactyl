import * as Completions from "@src/completions"
import * as Native from "@src/lib/native"

class PreferenceCompletionOption
    extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []

    constructor(public value: string, public prefvalue: string) {
        super()
        this.fuseKeys.push(value)
        this.html = html`<tr class="PreferenceCompletionOption option">
            <td class="name">${value}</td>
            <td class="value">${prefvalue}</td>
        </tr>`
    }
}

export class PreferenceCompletionSource extends Completions.CompletionSourceFuse {
    public options: PreferenceCompletionOption[]

    constructor(private _parent) {
        super(["setpref"], "PreferenceCompletionSource", "Preference")

        this._parent.appendChild(this.node)
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars-experimental
    /* override*/ async updateOptions(command, rest) {
        const preferences = await Native.getPrefs()
        this.options = Object.keys(preferences)
            .filter(key => key.startsWith(command))
            .map(key => new PreferenceCompletionOption(key, preferences[key]))
        if (this.options.length > 0) this.state = "normal"
    }
}

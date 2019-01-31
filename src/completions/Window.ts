import { browserBg } from "@src/lib/webext.ts"
import * as Completions from "@src/completions"

class WindowCompletionOption extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []

    constructor(win) {
        super()
        this.value = win.id
        this.fuseKeys.push(`${win.title}`)
        this.fuseKeys.push(`${win.id}`)

        // Create HTMLElement
        this.html = html`<tr class="WindowCompletionOption option ${win.incognito ? "incognito" : ""}">
            <td class="privatewindow"></td>
            <td class="id">${win.id}</td>
            <td class="title">${win.title}</td>
            <td class="tabcount">${win.tabs.length} tab${win.tabs.length != 1 ? "s" : ""}</td>
        </tr>`
    }
}

export class WindowCompletionSource extends Completions.CompletionSourceFuse {
    public options: WindowCompletionOption[]

    constructor(private _parent) {
        super(
            ["winclose"],
            "WindowCompletionSource",
            "Windows",
        )

        this.updateOptions()
        this._parent.appendChild(this.node)
    }

    private async updateOptions(exstr = "") {
        const [prefix, query] = this.splitOnPrefix(exstr)
        if (!prefix)
            return
        this.options = (await browserBg.windows.getAll({populate: true}))
            .map(win => new WindowCompletionOption(win))
        return this.updateChain()
    }

    async onInput(exstr) {
        // Schedule an update, if you like. Not very useful for windows, but
        // will be for other things.
        this.updateOptions(exstr)
    }

}

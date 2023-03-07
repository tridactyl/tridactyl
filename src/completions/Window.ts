import { browserBg } from "@src/lib/webext"
import * as Completions from "@src/completions"

class WindowCompletionOption
    extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []

    constructor(win: browser.windows.Window) {
        super()
        this.value = win.id
        this.fuseKeys.push(`${win.title}`)
        this.fuseKeys.push(`${win.id}`)

        // Create HTMLElement
        this.html = html`<tr
            class="WindowCompletionOption option ${win.incognito
                ? "incognito"
                : ""}"
        >
            <td class="privatewindow"></td>
            <td class="prefix">${win.focused ? "%" : ""}</td>
            <td class="id">${win.id}</td>
            <td class="title">${win.title}</td>
            <td class="tabcount">
                ${win.tabs.length} tab${win.tabs.length !== 1 ? "s" : ""}
            </td>
        </tr>`
    }
}

export class WindowCompletionSource extends Completions.CompletionSourceFuse {
    public options: WindowCompletionOption[]

    constructor(private _parent) {
        super(
            ["tabpush", "winclose", "winmerge"],
            "WindowCompletionSource",
            "Windows",
        )
        this._parent.appendChild(this.node)
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars-experimental
    /* override*/ async updateOptions(command, rest) {
        const excludeCurrentWindow = ["tabpush"].includes(command.trim())
        this.options = (await browserBg.windows.getAll({ populate: true }))
            .filter(win => !(excludeCurrentWindow && win.focused))
            .map(win => {
                const o = new WindowCompletionOption(win)
                o.state = "normal"
                return o
            })
        return this.updateDisplay()
    }
}

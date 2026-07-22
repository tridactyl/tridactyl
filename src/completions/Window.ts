import { browserBg } from "@src/lib/webext"
import * as Completions from "@src/completions"
import * as Messaging from "@src/lib/messaging"

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
    private removeTabChangesListener: () => void

    constructor(private _parent) {
        super(
            ["tabpush", "winclose", "winmerge"],
            "WindowCompletionSource",
            "Windows",
        )

        this.updateOptions()
        this._parent.appendChild(this.node)
        this.removeTabChangesListener = Messaging.addListener(
            "tab_changes",
            () => this.reactToTabChanges(),
        )
    }

    public destroy() {
        this.removeTabChangesListener()
    }

    async onInput(exstr) {
        // Schedule an update, if you like. Not very useful for windows, but
        // will be for other things.
        return this.updateOptions(exstr)
    }

    async filter(exstr) {
        this.lastExstr = exstr
        return this.onInput(exstr)
    }

    private async reactToTabChanges() {
        if (this.state === "hidden") return
        const lastFocusedWindowId =
            this.lastFocused?.state === "focused" ? this.lastFocused.value : undefined
        await this.updateOptions(this.lastExstr)
        const option = this.options?.find(o => o.value === lastFocusedWindowId)
        if (option) this.lastFocused.state = "normal"
        if (option) this.select(option)
    }

    private async updateOptions(exstr = "") {
        this.lastExstr = exstr
        const [prefix] = this.splitOnPrefix(exstr)

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

        const excludeCurrentWindow = this.canonicalisePrefix(prefix) === "tabpush"
        this.options = (await browserBg.windows.getAll({ populate: true }))
        .filter( win => !(excludeCurrentWindow && win.focused))
        .map(
            win => {
                const o = new WindowCompletionOption(win)
                o.state = "normal"
                return o
            },
        )
        return this.updateDisplay()
    }
}

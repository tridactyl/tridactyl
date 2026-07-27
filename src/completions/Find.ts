import * as Completions from "../completions"
import * as Messaging from "@src/lib/messaging"
import { ownTabId } from "@src/lib/webext"

class FindCompletionOption
    extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys

    constructor(index: number, match, args: string) {
        super()
        this.value = [`--jump-to ${index}`, args].filter(Boolean).join(" ")
        this.fuseKeys = [match.text, match.precontext, match.postcontext, match.breadcrumbs]
        this.html = html`<tr class="FindCompletionOption option">
            <td class="breadcrumbs">${match.breadcrumbs}</td>
            <td class="content">
                ${match.precontext}<span class="match">${match.text}</span
                >${match.postcontext}
            </td>
            <td class="position">${match.position}</td>
        </tr>`
    }
}

export class FindCompletionSource extends Completions.CompletionSourceFuse {
    public options: FindCompletionOption[] = []
    private session = Math.random()
    private tabId = ownTabId()
    private active = false
    private request = 0
    private findArgs = ""
    private pending: Promise<void> = Promise.resolve()
    private selection: Promise<void> = Promise.resolve()

    constructor(_parent?) {
        super(
            ["find"],
            "FindCompletionSource",
            html`<table><tr>
                <td class="breadcrumbs">Breadcrumbs</td>
                <td class="content">Context</td>
                <td class="position">Position</td>
            </tr></table>`,
        )
    }

    filter(exstr: string) {
        if (exstr === this.lastExstr && this.completion) return Promise.resolve()
        this.lastExstr = exstr
        const [, argstr] = this.splitOnPrefix(exstr)
        if (argstr === undefined) return this.cancel()
        const request = ++this.request
        this.findArgs = argstr.trim()
        this.active = true
        this.options = []
        this.optionContainer.replaceChildren()
        this.state = "hidden"
        const optionArgs = this.findArgs.split(/(?:^|\s)--(?:\s|$)/, 1)[0]
        if (/(^|\s)(--jump-to|-:)=?$/.test(optionArgs)) return this.cancel()
        const hasJump = /(^|\s)(--jump-to(?:=|\s)|-:(?:\s|$))/.test(optionArgs)
        const regex = /(^|\s)(-r|--regex)(?=\s|$)/.test(optionArgs)
        const delay = regex
            ? new Promise<void>(resolve => window.setTimeout(resolve, 250))
            : Promise.resolve()
        this.pending = delay
            .then(() => {
                if (request !== this.request) return
                return this.send(
                    { session: this.session, completions: !hasJump },
                    ...this.findArgs.split(/\s+/),
                )
            })
            .then(matches => {
                if (request !== this.request) return
                this.options = hasJump
                    ? []
                    : (matches || []).map(
                          match =>
                              new FindCompletionOption(
                                  match.index,
                                  match,
                                  this.findArgs,
                              ),
                      )
                if (this.options.length) this.updateChain(exstr, this.options)
                else this.state = "hidden"
                this.resize()
            })
            .catch(() => {
                if (request !== this.request) return
                this.options = []
                this.state = "hidden"
                this.resize()
                return this.send({ session: this.session, cancel: true })
            })
        return Promise.resolve()
    }

    setStateFromScore() {
        this.options.forEach(option => (option.state = "normal"))
        this.deselect()
    }

    scoredOptions() {
        return []
    }

    updateDisplay() {
        this.optionContainer.replaceChildren(
            ...this.options
                .filter(option => option.state !== "hidden")
                .map(option => option.html),
        )
        this.next(0)
    }

    select(option: FindCompletionOption) {
        super.select(option)
        this.selection = this.preview(option.value, true)
    }

    async next(inc = 1) {
        if (!this.active) return false
        const pending = this.pending
        if (inc !== 0) await this.pending
        if (!this.active || pending !== this.pending) return false
        const moved = await super.next(inc)
        if (inc !== 0 && moved) {
            if (!this.completion) this.selection = this.preview(this.findArgs)
            await this.selection
        }
        return moved
    }

    destroy() {
        return this.cancel()
    }

    private cancel() {
        if (!this.active) return Promise.resolve()
        ++this.request
        this.active = false
        this.options = []
        this.state = "hidden"
        return this.send({ session: this.session, cancel: true }).catch(
            () => undefined,
        )
    }

    private preview(args: string, selected = false) {
        return this.send(
            { session: this.session, completions: false, selected },
            ...args.split(/\s+/),
        )
            .then(() => undefined)
            .catch(() => undefined)
    }

    private send(preview, ...args: string[]) {
        return this.tabId.then(tabId =>
            Messaging.messageTab(tabId, "excmd_content", "find", [
                preview,
                ...args,
            ]),
        )
    }

    private resize() {
        window.dispatchEvent(new Event("tridactyl-refresh-completions"))
    }
}

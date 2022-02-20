import * as Messaging from "@src/lib/messaging"
import * as Completions from "@src/completions"
import * as config from "@src/lib/config"

class GotoCompletionOption
    extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []

    constructor(public level, public y, public title, public value) {
        super()
        this.fuseKeys.push(title)

        this.html = html`<tr class="GotoCompletionOption option">
            <td class="title" style="padding-left: ${level * 4}ch">${title}</td>
        </tr>`
    }
}

export class GotoCompletionSource extends Completions.CompletionSourceFuse {
    public options: GotoCompletionOption[] = []
    private shouldSetStateFromScore = true

    constructor(private _parent) {
        super(["goto"], "GotoCompletionSource", "Headings")

        this.updateOptions()
        this.shouldSetStateFromScore =
            config.get("completions", "Goto", "autoselect") === "true"
        this._parent.appendChild(this.node)
    }

    setStateFromScore(scoredOpts: Completions.ScoredOption[]) {
        super.setStateFromScore(scoredOpts, this.shouldSetStateFromScore)
    }

    onInput(...whatever) {
        return this.updateOptions(...whatever)
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

        if (this.options.length < 1) {
            this.options = (
                await Messaging.messageOwnTab(
                    "excmd_content",
                    "getGotoSelectors",
                    [],
                )
            )
                .sort((a, b) => a.y - b.y)
                .map(heading => {
                    const opt = new GotoCompletionOption(
                        heading.level,
                        heading.y,
                        heading.title,
                        heading.selector,
                    )
                    opt.state = "normal"
                    return opt
                })
        }
        return this.updateChain()
    }
}

import * as Completions from "@src/completions"
import * as providers from "@src/completions/providers"
import * as config from "@src/lib/config"

export class ContainerCompletionOption
    extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse
{
    public fuseKeys: string[] = []

    constructor(
        public value: string,
        container: browser.contextualIdentities.ContextualIdentity,
    ) {
        super()

        this.fuseKeys.push(container.name)

        this.html = html`<tr class="ContainerCompletionOption option">
            <td class="value">${container.name}</td>
        </tr>`
    }
}

export class ContainerCompletionSource extends Completions.CompletionSourceFuse {
    public options: ContainerCompletionOption[] = []
    private shouldSetStateFromScore: boolean

    constructor(private _parent: HTMLElement) {
        super(["recontain"], "ContainerCompletionSource", "Containers")

        this._parent.appendChild(this.node)
        this.sortScoredOptions = true
        this.shouldSetStateFromScore =
            config.get("completions", "Containers", "autoselect") === "true"
    }

    public async filter(exstr: string) {
        this.lastExstr = exstr
        const [prefix, query] = this.splitOnPrefix(exstr)

        if (prefix) {
            if (this.state === "hidden") {
                this.state = "normal"
            }
        } else {
            this.state = "hidden"
            return
        }

        this.completion = undefined
        this.options = (await providers.getContainers(query))
            .slice(0, 10)
            .map(
                container =>
                    new ContainerCompletionOption(container.name, container),
            )

        this.lastExstr = [prefix, query].join(" ")
        return this.updateChain()
    }

    setStateFromScore(scoredOpts: Completions.ScoredOption[]) {
        super.setStateFromScore(scoredOpts, this.shouldSetStateFromScore)
    }

    updateChain() {
        const query = this.splitOnPrefix(this.lastExstr)[1]

        if (query && query.trim().length > 0) {
            this.setStateFromScore(this.scoredOptions(query))
        } else {
            this.options.forEach(option => (option.state = "normal"))
        }

        return this.updateDisplay()
    }

    select(option: Completions.CompletionOption) {
        if (this.lastExstr !== undefined && option !== undefined) {
            this.completion = ["recontain", option.value].join(" ")
            option.state = "focused"
            this.lastFocused = option
        } else {
            throw new Error("lastExstr and option must be defined")
        }
    }
}

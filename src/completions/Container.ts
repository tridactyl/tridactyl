import * as Completions from "@src/completions"
import * as providers from "@src/completions/providers"

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

    constructor(private _parent: HTMLElement) {
        super(["recontain"], "ContainerCompletionSource", "Containers")
        this._parent.appendChild(this.node)
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

    updateChain() {
        const query = this.splitOnPrefix(this.lastExstr)[1]

        if (query && query.trim().length > 0) {
            this.setStateFromScore(this.scoredOptions(query))
        } else {
            this.options.forEach(option => (option.state = "normal"))
        }

        return this.updateDisplay()
    }
}

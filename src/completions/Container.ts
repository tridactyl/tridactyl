import * as Completions from "@src/completions"
import * as Containers from "@src/lib/containers"

class ContainerCompletionOption
    extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []

    constructor(public value: string) {
        super()
        this.fuseKeys.push(value)
        this.html = html`<tr class="ContainerCompletionOption option">
            <td class="title">${value}</td>
        </tr>`
    }
}

export class ContainerCompletionSource extends Completions.CompletionSourceFuse {
    public options: ContainerCompletionOption[]

    constructor(private _parent) {
        super(["recontain", "containerclose", "containerdelete", "containerupdate"], "ContainerCompletionSource", "Containers")
        this._parent.appendChild(this.node)
    }

    async onInput(exstr: string) {
        const [prefix, query] = this.splitOnPrefix(exstr)
        if (!prefix) return
        const command = this.canonicalisePrefix(prefix)
        this.options =
            command === "containerupdate" && /\s/u.test(query)
                ? undefined
                : (await Containers.getAll())
                      .filter(container => command !== "containerupdate" || !/\s/u.test(container.name))
                      .map(container => new ContainerCompletionOption(container.name))
    }
}

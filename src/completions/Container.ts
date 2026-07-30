import * as Completions from "@src/completions"
import * as Containers from "@src/lib/containers"
import * as arg from "@src/lib/arg_util"
import { getOpenArgs } from "@src/lib/open_args"

class ContainerCompletionOption
    extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []

    constructor(name: string, public value = name) {
        super()
        this.fuseKeys.push(name)
        this.html = html`<tr class="ContainerCompletionOption option">
            <td class="title">${name}</td>
        </tr>`
    }
}

export class ContainerCompletionSource extends Completions.CompletionSourceFuse {
    public options: ContainerCompletionOption[]

    constructor(private _parent) {
        super(["recontain", "containerclose", "containerdelete", "containerupdate", "tabopen", "winopen"], "ContainerCompletionSource", "Containers")
        this._parent.appendChild(this.node)
    }

    async onInput(exstr: string) {
        const [prefix, query] = this.splitOnPrefix(exstr)
        if (!prefix) return
        const command = this.canonicalisePrefix(prefix)
        this.options = undefined
        this.deselect()
        this.state = "hidden"
        const spec = getOpenArgs(command)
        if (spec) {
            const analysis = arg.analyseForCompletion(spec, query)
            if (analysis.activeValue?.option !== "-c") {
                this.options = undefined
                return
            }
            this.lastExstr = `${prefix} ${analysis.activeValue.query}`
            const names = [
                "none",
                "firefox-default",
                ...(await Containers.getAll())
                    .map(container => container.name)
                    .filter(
                        name =>
                            !/\s/u.test(name) &&
                            arg.analyseForCompletion(spec, `-c ${name}`)
                                .activeValue?.query === name,
                    ),
            ]
            this.options = [...new Set(names)].map(
                name =>
                    new ContainerCompletionOption(
                        name,
                        arg.replaceActiveValue(analysis, name).join(" "),
                    ),
            )
            return
        }
        this.options =
            command === "containerupdate" && /\s/u.test(query)
                ? undefined
                : (await Containers.getAll())
                      .filter(container => command !== "containerupdate" || !/\s/u.test(container.name))
                      .map(container => new ContainerCompletionOption(container.name))
    }
}

import * as Completions from "@src/completions"
import {
    excmdsFunctions,
    defaultConfigMembers,
    getDoc,
    memberDoc,
} from "@src/.metadata.generated"
import * as aliases from "@src/lib/aliases"
import * as config from "@src/lib/config"

class AproposCompletionOption extends Completions.CompletionOptionHTML implements Completions.CompletionOptionFuse {
    public fuseKeys = []

    constructor(
        public name: string,
        doc: string,
        flag: string,
    ) {
        super()
        this.value = `${flag} ${name}`
        this.html = html`<tr class="AproposCompletionOption option">
            <td class="name">${name}</td>
            <td class="doc">${doc}</td>
        </tr>`
    }
}

export class AproposCompletionSource extends Completions.CompletionSourceFuse {
    public options: AproposCompletionOption[]

    constructor(
        private _parent,
        prefixes = ["apropos"],
        className = "AproposCompletionSource",
        title = "Apropos",
    ) {
        super(prefixes, className, title)

        this._parent.appendChild(this.node)
    }

    protected createOption(name: string, doc: string, flag: string) {
        return new AproposCompletionOption(name, doc, flag)
    }

    public async filter(exstr: string) {
        this.lastExstr = exstr
        this.completion = undefined
        const [prefix, query] = this.splitOnPrefix(exstr)

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

        const settings = config.get()
        const exaliases = settings.exaliases
        const bindings = settings.nmaps
        if (exaliases === undefined || bindings === undefined) {
            return
        }
        const fns = Object.entries(excmdsFunctions)

        const flags = {
            "-a": (options, query) =>
                options.concat(
                    Object.keys(exaliases)
                        .filter(alias =>
                            (
                                alias +
                                aliases.expandExstr(alias) +
                                excmdsFunctions[aliases.expandExstr(alias)]
                            )
                                .toLowerCase()
                                .includes(query),
                        )
                        .map(alias => {
                            const cmd = aliases.expandExstr(alias)
                            const doc = getDoc(excmdsFunctions[cmd])
                            return this.createOption(
                                alias,
                                `Alias for \`${cmd}\`. ${doc}`,
                                "-a",
                            )
                        }),
                ),
            "-b": (options, query) =>
                options.concat(
                    Object.keys(bindings)
                        .filter(binding =>
                            (binding + bindings[binding])
                                .toLowerCase()
                                .includes(query),
                        )
                        .map(
                            binding =>
                                this.createOption(
                                    binding,
                                    `Normal mode binding for \`${bindings[binding]}\``,
                                    "-b",
                                ),
                        ),
                ),
            "-e": (options, query) =>
                options.concat(
                    fns
                        .filter(([name, fn]) =>
                            (name + getDoc(fn)).toLowerCase().includes(query),
                        )
                        .map(
                            ([name, fn]) =>
                                this.createOption(
                                    name,
                                    `Excmd. ${getDoc(fn)}`,
                                    "-e",
                                ),
                        ),
                ),
            "-s": (options, query) =>
                options.concat(
                    Object.keys(settings)
                        .filter(x =>
                            (x + memberDoc(defaultConfigMembers[x]))
                                .toLowerCase()
                                .includes(query),
                        )
                        .map(setting => {
                            const doc = memberDoc(defaultConfigMembers[setting])
                            return this.createOption(
                                setting,
                                `Setting. ${doc}`,
                                "-s",
                            )
                        }),
                ),
        }

        const args = query.split(" ")
        let opts = []
        if (Object.keys(flags).includes(args[0])) {
            opts = flags[args[0]](opts, args.slice(1).join(" "))
        } else {
            opts = Object.keys(flags).reduce(
                (acc, curFlag) => flags[curFlag](acc, query),
                [],
            )
        }

        this.options = opts
        this.options.sort((compopt1, compopt2) =>
            compopt1.name.localeCompare(compopt2.name),
        )
        return this.updateChain()
    }

    updateChain() {
        // Options are pre-trimmed to the right length.
        this.options.forEach(option => (option.state = "normal"))

        // Call concrete class
        return this.updateDisplay()
    }
}

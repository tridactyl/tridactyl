import * as Completions from "@src/completions"
import { AproposCompletionSource } from "@src/completions/Apropos"
import {
    excmdsFunctions,
    defaultConfigMembers,
    getDoc,
    memberDoc,
} from "@src/.metadata.generated"
import * as aliases from "@src/lib/aliases"
import * as config from "@src/lib/config"

class HelpCompletionOption extends Completions.CompletionOptionHTML implements Completions.CompletionOptionFuse {
    public fuseKeys = []

    constructor(
        public name: string,
        doc: string,
        flag: string,
    ) {
        super()
        this.value = `${flag} ${name}`
        this.html = html`<tr class="HelpCompletionOption option">
            <td class="name">${name}</td>
            <td class="doc">${doc}</td>
        </tr>`
    }
}

export class HelpCompletionSource extends AproposCompletionSource {
    public options: HelpCompletionOption[]

    constructor(_parent) {
        super(_parent, ["help"], "HelpCompletionSource", "Help")
    }

    protected createOption(name: string, doc: string, flag: string) {
        return new HelpCompletionOption(name, doc, flag)
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
        this.node.querySelector(".sectionHeader").textContent = "Help (prefix matches)"

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
                        .filter(alias => alias.startsWith(query))
                        .map(alias => {
                            const cmd = aliases.expandExstr(alias)
                            const doc = getDoc(excmdsFunctions[cmd])
                            return new HelpCompletionOption(
                                alias,
                                `Alias for \`${cmd}\`. ${doc}`,
                                "-a",
                            )
                        }),
                ),
            "-b": (options, query) =>
                options.concat(
                    Object.keys(bindings)
                        .filter(binding => binding.startsWith(query))
                        .map(
                            binding =>
                                new HelpCompletionOption(
                                    binding,
                                    `Normal mode binding for \`${bindings[binding]}\``,
                                    "-b",
                                ),
                        ),
                ),
            "-e": (options, query) =>
                options.concat(
                    fns
                        .filter(([name]) => name.startsWith(query))
                        .map(
                            ([name, fn]) =>
                                new HelpCompletionOption(
                                    name,
                                    `Excmd. ${getDoc(fn)}`,
                                    "-e",
                                ),
                        ),
                ),
            "-s": (options, query) =>
                options.concat(
                    Object.keys(settings)
                        .filter(x => x.startsWith(query))
                        .map(setting => {
                            const doc = memberDoc(defaultConfigMembers[setting])
                            return new HelpCompletionOption(
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

        if (opts.length === 0) {
            this.node.querySelector(".sectionHeader").textContent = "Help (prefix match failed, showing :apropos matches)"
            return super.filter(exstr)
        }

        this.options = opts
        this.options.sort((compopt1, compopt2) =>
            compopt1.name.localeCompare(compopt2.name),
        )
        return this.updateChain()
    }
}

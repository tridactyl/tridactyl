import * as Completions from "@src/completions"
import * as Metadata from "@src/.metadata.generated"
import * as aliases from "@src/lib/aliases"
import * as config from "@src/lib/config"
import state from "@src/state"
import { browserBg } from "@src/lib/webext"

class HelpCompletionOption extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []

    constructor(public name: string, doc: string, flag: string) {
        super()
        this.value = `${flag} ${name}`
        this.html = html`<tr class="HelpCompletionOption option">
                <td class="name">${name}</td>
                <td class="doc">${doc}</td>
            </tr>`
    }
}

export class HelpCompletionSource extends Completions.CompletionSourceFuse {
    public options: HelpCompletionOption[]

    constructor(private _parent) {
        super(["help"], "HelpCompletionSource", "Help")

        this._parent.appendChild(this.node)
    }

    public async filter(exstr: string) {
        this.lastExstr = exstr
        this.completion = undefined
        let [prefix, query] = this.splitOnPrefix(exstr)
        let options = ""

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

        let file, default_config, excmds, fns, settings, exaliases, bindings
        if (
            !(file = Metadata.everything.getFile("src/lib/config.ts")) ||
            !(default_config = file.getClass("default_config")) ||
            !(excmds = Metadata.everything.getFile("src/excmds.ts")) ||
            !(fns = excmds.getFunctions()) ||
            !(settings = config.get()) ||
            !(exaliases = settings.exaliases) ||
            !(bindings = settings.nmaps)
        )
            return

        const flags = {
            "-a": (options, query) =>
                options.concat(
                    Object.keys(exaliases)
                        .filter(alias => alias.startsWith(query))
                        .map(alias => {
                            let cmd = aliases.expandExstr(alias)
                            let doc = (excmds.getFunction(cmd) || {}).doc || ""
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
                                    `Normal mode binding for \`${
                                        bindings[binding]
                                    }\``,
                                    "-b",
                                ),
                        ),
                ),
            "-e": (options, query) =>
                options.concat(
                    fns
                        .filter(
                            ([name, fn]) =>
                                !fn.hidden && name.startsWith(query),
                        )
                        .map(
                            ([name, fn]) =>
                                new HelpCompletionOption(
                                    name,
                                    `Excmd. ${fn.doc}`,
                                    "-e",
                                ),
                        ),
                ),
            "-s": (options, query) =>
                options.concat(
                    Object.keys(settings)
                        .filter(x => x.startsWith(query))
                        .map(setting => {
                            let member,
                                doc = ""
                            if ((member = default_config.getMember(setting))) {
                                doc = member.doc
                            }
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

    onInput() {}
}

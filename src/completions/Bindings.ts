import * as Completions from "@src/completions"
import * as config from "@src/lib/config"
import * as Binding from "@src/lib/binding"

class BindingsCompletionOption
    extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []

    constructor(
        public value: string,
        binding: { name: string; value: string; mode: string },
    ) {
        super()
        this.html = html`<tr class="BindingsCompletionOption option">
            <td class="name">${binding.name}</td>
            <td class="content">${binding.value}</td>
            <td class="type">${binding.mode}</td>
        </tr>`
    }
}

export class BindingsCompletionSource extends Completions.CompletionSourceFuse {
    public options: BindingsCompletionOption[]

    constructor(private _parent) {
        super(
            ["bind", "unbind", "bindurl", "unbindurl", "reset", "reseturl"],
            "BindingsCompletionSource",
            "Bindings",
        )

        this._parent.appendChild(this.node)
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars-experimental
    /* override*/ async updateOptions(command, rest) {
        let options = ""
        const args = rest ? rest.split(/\s+/) : []
        let configName = "nmaps"
        let modeName = "normal"
        let urlPattern: string = null

        this.deselect()

        // url pattern is mandatory: bindurl, unbindurl, reseturl
        if (command.trim().endsWith("url")) {
            urlPattern = args.length > 0 ? args.shift() : ""
            options += urlPattern ? urlPattern + " " : ""

            if (args.length === 0) {
                const patterns = config.get("subconfigs")
                this.options = Object.keys(patterns)
                    .filter(pattern => pattern.startsWith(urlPattern))
                    .sort()
                    .map(
                        pattern =>
                            new BindingsCompletionOption(pattern, {
                                name: pattern,
                                value: "",
                                mode: "URL Pattern",
                            }),
                    )

                return
            }
        }

        // completion maps mode
        if (args.length === 1 && args[0].startsWith("--m")) {
            const margs = args[0].split("=")
            if ("--mode".includes(margs[0])) {
                const modeStr = margs.length > 1 ? margs[1] : ""
                this.options = Binding.modes
                    .filter(k => k.startsWith(modeStr))
                    .map(
                        name =>
                            new BindingsCompletionOption(
                                options + "--mode=" + name,
                                {
                                    name,
                                    value: "",
                                    mode: "Mode Name",
                                },
                            ),
                    )
                return
            }
        }

        if (args.length > 0 && args[0].startsWith("--mode=")) {
            const modeStr = args.shift()
            const mode = modeStr.replace("--mode=", "")

            modeName = mode
            if (Binding.maps2mode.has(mode + "maps")) {
                modeName = Binding.maps2mode.get(mode + "maps")
            }
            configName = Binding.mode2maps.get(modeName)
            options += `--mode=${modeName} `
        }

        if (!configName) {
            this.options = []
            return
        }

        const bindings = urlPattern
            ? config.getURL(urlPattern, [configName])
            : config.get(configName as any)

        if (bindings === undefined) {
            this.options = []
            return
        }

        rest = args.join(" ").toLowerCase()
        this.options = Object.keys(bindings)
            .filter(x => x.toLowerCase().startsWith(rest))
            .sort()
            .map(
                keystr =>
                    new BindingsCompletionOption(options + keystr, {
                        name: keystr,
                        value: JSON.stringify(bindings[keystr]),
                        mode: `${configName} (${modeName})`,
                    }),
            )
    }
}

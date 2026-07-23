import * as Completions from "@src/completions"
import * as config from "@src/lib/config"
import {
    defaultConfigMembers,
    memberDoc,
    memberType,
    typeToString,
} from "@src/.metadata.generated"

class SettingsCompletionOption extends Completions.CompletionOptionHTML implements Completions.CompletionOptionFuse {
    public fuseKeys = []

    constructor(
        public value: string,
        setting: { name: string; value: string; type: string; doc: string },
    ) {
        super()
        this.html = html`<tr class="SettingsCompletionOption option">
            <td class="title">${setting.name}</td>
            <td class="content">${setting.value}</td>
            <td class="type">${setting.type}</td>
            <td class="doc">${setting.doc}</td>
        </tr>`
    }
}

export class SettingsCompletionSource extends Completions.CompletionSourceFuse {
    public options: SettingsCompletionOption[]

    constructor(private _parent) {
        super(
            ["set", "setnull", "get", "unset", "seturl", "unseturl", "viewconfig"],
            "SettingsCompletionSource",
            "Settings",
        )

        this._parent.appendChild(this.node)
    }

    public async filter(exstr: string) {
        this.lastExstr = exstr
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
        prefix = this.canonicalisePrefix(prefix)

        if (prefix === "unseturl" && !query.includes(" ")) {
            this.options = Object.keys(config.get("subconfigs"))
                .filter(pattern => pattern.startsWith(query))
                .sort()
                .map(
                    pattern =>
                        new SettingsCompletionOption(pattern, {
                            name: pattern,
                            value: "",
                            type: "URL Pattern",
                            doc: "",
                        }),
                )
            return this.updateChain()
        }

        // Ignoring command-specific arguments
        // It's terrible but it's ok because it's just a stopgap until an actual commandline-parsing API is implemented
        // copy pasting code is fun and good
        if (
            prefix === "seturl" ||
            prefix === "unseturl" ||
            (prefix === "viewconfig" &&
                (query.startsWith("--user") || query.startsWith("--default")))
        ) {
            const args = query.split(" ")
            options = args.slice(0, 1).join(" ")
            query = args.slice(1).join(" ")
        }

        options += options ? " " : ""

        const settings = config.get()

        if (settings === undefined) {
            return
        }

        const settingNames = Object.keys(settings)
        let matches = settingNames.filter(x => x.startsWith(query))
        if (matches.length === 0) {
            matches = settingNames.filter(x => x.includes(query))
        }

        this.options = matches
            .sort()
            .map(setting => {
                const md = defaultConfigMembers[setting]
                return new SettingsCompletionOption(options + setting, {
                    name: setting,
                    value: JSON.stringify(settings[setting]),
                    doc: memberDoc(md),
                    type: md ? typeToString(memberType(md)) : "",
                })
            })

        return this.updateChain()
    }

    updateChain() {
        // Options are pre-trimmed to the right length.
        this.options.forEach(option => (option.state = "normal"))

        // Call concrete class
        return this.updateDisplay()
    }
}

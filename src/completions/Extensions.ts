import * as Extensions from "@src/lib/extension_info"
import * as Completions from "@src/completions"

class ExtensionsCompletionOption
    extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []

    constructor(public name: string, public optionsUrl: string) {
        super()
        this.fuseKeys.push(this.name)

        this.html = html`<tr class="option">
            <td class="title">${name}</td>
        </tr>`
    }
}

export class ExtensionsCompletionSource extends Completions.CompletionSourceFuse {
    public options: ExtensionsCompletionOption[]

    constructor(private _parent) {
        super(["extoptions"], "ExtensionsCompletionSource", "Extension options")

        this._parent.appendChild(this.node)
    }

    select(option: ExtensionsCompletionOption) {
        this.completion = "extoptions " + option.name
        option.state = "focused"
        this.lastFocused = option
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars-experimental
    /* override*/ protected async updateOptions(command, rest) {
        const extensions = await Extensions.listExtensions()

        this.options = this.scoreOptions(
            extensions
                .filter(extension => extension.name.startsWith(rest))
                .map(
                    extension =>
                        new ExtensionsCompletionOption(
                            extension.name,
                            extension.optionsUrl,
                        ),
                ),
        )
    }

    private scoreOptions(options: ExtensionsCompletionOption[]) {
        return options.sort((o1, o2) => o1.name.localeCompare(o2.name))
    }
}

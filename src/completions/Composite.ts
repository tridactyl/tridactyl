import * as Completions from "@src/completions"
import * as ExcmdCompletions from "@src/completions/Excmd"
import * as Metadata from "@src/.metadata.generated"
import * as config from "@src/lib/config"
import * as aliases from "@src/lib/aliases"

const PREFIX = "composite"
const regex = new RegExp("^" + PREFIX + " ")

// Most of this is copied verbatim from Excmd.ts - would have liked to inherit but constructor posed difficulties
export class CompositeCompletionSource extends Completions.CompletionSourceFuse {
    public options: ExcmdCompletions.ExcmdCompletionOption[]

    constructor(private _parent) {
        super([PREFIX], "CompositeCompletionSource", "ex commands")
        this._parent.appendChild(this.node)
    }

    select(option: ExcmdCompletions.ExcmdCompletionOption) {
        this.completion =
            this.lastExstr.replace(
                new RegExp(this.getendexstr(this.lastExstr) + "$"),
                "",
            ) + option.value
        option.state = "focused"
        this.lastFocused = option
    }

    setStateFromScore(scoredOpts: Completions.ScoredOption[]) {
        super.setStateFromScore(scoredOpts, false)
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars-experimental
    /* override*/ protected async updateOptions(command, rest) {
        const end_exstr = this.getendexstr(rest)
        const excmds = Metadata.everything.getFile("src/excmds.ts")
        if (!excmds) return
        const fns = excmds.getFunctions()

        // Add all excmds that start with exstr and that tridactyl has metadata about to completions
        this.options = this.scoreOptions(
            fns
                .filter(
                    ([name, fn]) => !fn.hidden && name.startsWith(end_exstr),
                )
                .map(
                    ([name, fn]) =>
                        new ExcmdCompletions.ExcmdCompletionOption(
                            name,
                            fn.doc,
                        ),
                ),
        )

        // Also add aliases to possible completions
        const exaliases = Object.keys(config.get("exaliases")).filter(a =>
            a.startsWith(end_exstr),
        )
        for (const alias of exaliases) {
            const cmd = aliases.expandExstr(alias)
            const fn = excmds.getFunction(cmd)
            if (fn) {
                this.options.push(
                    new ExcmdCompletions.ExcmdCompletionOption(
                        alias,
                        `Alias for \`${cmd}\`. ${fn.doc}`,
                    ),
                )
            } else {
                // This can happen when the alias is a composite command or a command with arguments. We can't display doc because we don't know what parameter the alias takes or what it does.
                this.options.push(
                    new ExcmdCompletions.ExcmdCompletionOption(
                        alias,
                        `Alias for \`${cmd}\`.`,
                    ),
                )
            }
        }
    }

    private scoreOptions(options: ExcmdCompletions.ExcmdCompletionOption[]) {
        return options.sort((o1, o2) => o1.value.localeCompare(o2.value))
    }

    private getendexstr(exstr) {
        return exstr
            .replace(regex, "")
            .split("|")
            .slice(-1)[0]
            .split(";")
            .slice(-1)[0]
            .trim()
    }
}

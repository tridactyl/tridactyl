import * as Completions from "@src/completions"
import { flagsFor } from "@src/lib/excmd_flags"

export class FlagCompletionOption
    extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []

    constructor(
        public value: string,
        flag: string,
        label: string,
    ) {
        super()
        this.fuseKeys.push(flag, label)
        this.html = html`<tr class="FlagCompletionOption option">
            <td class="flag">${flag}</td>
            <td class="documentation">${label}</td>
        </tr>`
    }
}

// e.g. "hint -Jc" -> { cmdWord: "hint", combined: "Jc" }.
// Returns undefined once the user moves past the flag token (hit a space)
function typingFlagToken(
    exstr: string,
): { cmdWord: string; combined: string } | undefined {
    const trimmed = exstr.replace(/^\s+/, "")
    const spaceIdx = trimmed.search(/\s/)
    if (spaceIdx === -1) return undefined

    const cmdWord = trimmed.slice(0, spaceIdx)
    const afterCmd = trimmed.slice(spaceIdx).replace(/^\s+/, "")
    if (afterCmd.search(/\s/) !== -1) return undefined
    if (afterCmd !== "" && !afterCmd.startsWith("-")) return undefined

    return { cmdWord, combined: afterCmd.slice(1) }
}

export class FlagCompletionSource extends Completions.CompletionSourceFuse {
    public options: FlagCompletionOption[]

    constructor(private _parent) {
        super([], "FlagCompletionSource", "flags", { trailingSpace: false })
        this._parent.appendChild(this.node)
    }

    async filter(exstr: string) {
        this.lastExstr = exstr
        return this.onInput(exstr)
    }

    async onInput(exstr: string) {
        return this.updateOptions(exstr)
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    updateChain(exstr = this.lastExstr, options = this.options) {
        this.state = this.options.length > 0 ? "normal" : "hidden"
        this.updateDisplay()
    }

    select(option: FlagCompletionOption) {
        this.completion = option.value
        option.state = "focused"
        this.lastFocused = option
    }

    private updateOptions(exstr: string) {
        this.options = []

        const typing = typingFlagToken(exstr)
        const metaFlags = typing && flagsFor(typing.cmdWord)
        if (typing && metaFlags) {
            const { cmdWord, combined } = typing
            const used = new Set(combined.split(""))
            // groups already spoken for by chars already typed
            const claimedGroups = new Set(
                Array.from(used)
                    .map(ch => metaFlags[`-${ch}`]?.group)
                    .filter(Boolean),
            )
            const couldStillBeMultiChar = Object.keys(metaFlags).some(
                flag =>
                    flag.slice(1).length > 1 &&
                    flag.slice(1).startsWith(combined),
            )
            // past the multi-char stage, every char must be a real flag or it's a typo
            const validSoFar =
                couldStillBeMultiChar ||
                Array.from(used).every(ch => metaFlags[`-${ch}`] !== undefined)

            for (const [flag, meta] of validSoFar
                ? Object.entries(metaFlags)
                : []) {
                const name = flag.slice(1)
                if (name.length === 1) {
                    if (used.has(name)) continue
                    if (meta.group && claimedGroups.has(meta.group)) continue
                    const value = `${cmdWord} -${combined}${name}`
                    this.options.push(
                        new FlagCompletionOption(
                            value,
                            `-${combined}${name}`,
                            meta.short,
                        ),
                    )
                } else if (name.startsWith(combined)) {
                    // -pipe/-W/-fr/-wp take the rest of the line, offer them whole
                    const value = `${cmdWord} ${flag} `
                    this.options.push(
                        new FlagCompletionOption(value, flag, meta.short),
                    )
                }
            }
        }

        this.options.forEach(o => (o.state = "normal"))
        return this.updateChain()
    }
}

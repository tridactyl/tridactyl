import { enumerate } from "../itertools"
import * as Containers from "../lib/containers"
import * as Messaging from "../messaging"
import * as Completions from "../completions"

class BufferCompletionOption extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []

    constructor(
        public value: string,
        tab: browser.tabs.Tab,
        public isAlternative = false,
        container: browser.contextualIdentities.ContextualIdentity,
    ) {
        super()
        // Two character buffer properties prefix
        let pre = ""
        if (tab.active) pre += "%"
        else if (isAlternative) {
            pre += "#"
            this.value = "#"
        }
        if (tab.pinned) pre += "@"

        // Push prefix before padding so we don't match on whitespace
        this.fuseKeys.push(pre)

        // Push properties we want to fuzmatch on
        this.fuseKeys.push(String(tab.index + 1), tab.title, tab.url)

        // Create HTMLElement
        const favIconUrl = tab.favIconUrl
            ? tab.favIconUrl
            : Completions.DEFAULT_FAVICON
        this.html = html`<tr class="BufferCompletionOption option container_${
            container.color
        } container_${container.icon} container_${container.name}">
            <td class="prefix">${pre.padEnd(2)}</td>
            <td class="container"></td>
            <td class="icon"><img src="${favIconUrl}"/></td>
            <td class="title">${tab.index + 1}: ${tab.title}</td>
            <td class="content"><a class="url" target="_blank" href=${
                tab.url
            }>${tab.url}</a></td>
        </tr>`
    }
}

export class BufferCompletionSource extends Completions.CompletionSourceFuse {
    public options: BufferCompletionOption[]

    // TODO:
    //     - store the exstr and trigger redraws on user or data input without
    //       callback faffery
    //     - sort out the element redrawing.

    constructor(private _parent) {
        super(
            ["buffer", "tabclose", "tabdetach", "tabduplicate", "tabmove"],
            "BufferCompletionSource",
            "Buffers",
        )

        this.updateOptions()
        this._parent.appendChild(this.node)
    }

    private async updateOptions(exstr?: string) {
        /* console.log('updateOptions', this.optionContainer) */
        const tabs: browser.tabs.Tab[] = await Messaging.message(
            "commandline_background",
            "currentWindowTabs",
        )

        const options = []

        // Get alternative tab, defined as last accessed tab.
        const alt = tabs.sort((a, b) => {
            return a.lastAccessed < b.lastAccessed ? 1 : -1
        })[1]
        tabs.sort((a, b) => {
            return a.index < b.index ? -1 : 1
        })

        for (const tab of tabs) {
            options.push(
                new BufferCompletionOption(
                    (tab.index + 1).toString(),
                    tab,
                    tab === alt,
                    await Containers.getFromId(tab.cookieStoreId),
                ),
            )
        }

        this.completion = undefined
        this.options = options
        this.updateChain()
    }

    async onInput(exstr) {
        // Schedule an update, if you like. Not very useful for buffers, but
        // will be for other things.
        this.updateOptions()
    }

    setStateFromScore(scoredOpts: Completions.ScoredOption[]) {
        super.setStateFromScore(scoredOpts, true)
    }

    /** Score with fuse unless query is a single # or looks like a buffer index */
    scoredOptions(
        query: string,
        options = this.options,
    ): Completions.ScoredOption[] {
        const args = query.trim().split(/\s+/gu)
        if (args.length === 1) {
            // if query is an integer n and |n| < options.length
            if (Number.isInteger(Number(args[0]))) {
                let index = Number(args[0]) - 1
                if (Math.abs(index) < options.length) {
                    index = index.mod(options.length)
                    return [
                        {
                            index,
                            option: options[index],
                            score: 0,
                        },
                    ]
                }
            } else if (args[0] === "#") {
                for (const [index, option] of enumerate(options)) {
                    if (option.isAlternative) {
                        return [
                            {
                                index,
                                option,
                                score: 0,
                            },
                        ]
                    }
                }
            }
        }

        // If not yet returned...
        return super.scoredOptions(query, options)
    }
}

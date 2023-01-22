import * as Completions from "@src/completions"
import * as config from "@src/lib/config"
import {
    tgroups,
    windowTgroup,
    windowLastTgroup,
    tgroupTabs,
} from "@src/lib/tab_groups"

class TabGroupCompletionOption
    extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []

    constructor(
        group: string,
        tabCount: number,
        current: boolean,
        alternate: boolean,
        audible: boolean,
        urls: string[],
    ) {
        super()
        this.value = group
        let preplain = ""
        if (current) {
            preplain += "%"
        }
        if (alternate) {
            preplain += "#"
        }
        let pre = preplain
        if (audible) {
            preplain += "A"
        }
        if (config.get("completions", "Tab", "statusstylepretty") === "true") {
            if (audible) {
                pre += "\uD83D\uDD0A"
            }
        } else {
            pre = preplain
        }

        this.fuseKeys.push(group)
        this.fuseKeys.push(pre)
        this.fuseKeys.push(preplain)
        this.fuseKeys.push(urls)

        this.html = html`<tr class="TabGroupCompletionOption option">
            <td class="prefix">${pre}</td>
            <td class="prefixplain" hidden>${preplain}</td>
            <td class="title">${group}</td>
            <td class="tabcount">
                ${tabCount} tab${tabCount !== 1 ? "s" : ""}
            </td>
            <td class="content"></td>
        </tr>`
        const urlMarkup = urls.map(
            u => `<a class="url" target="_blank" href="${u}">${u}</a>`,
        )
        this.html.lastElementChild.innerHTML = urlMarkup.join(", ")
    }
}

export class TabGroupCompletionSource extends Completions.CompletionSourceFuse {
    public options: TabGroupCompletionOption[]

    constructor(private _parent: any) {
        super(
            ["tgroupswitch", "tgroupmove", "tgroupclose"],
            "TabGroupCompletionSource",
            "Tab Groups",
        )

        this.updateOptions()
        this._parent.appendChild(this.node)
    }

    async onInput(exstr) {
        return this.updateOptions(exstr)
    }

    private async updateOptions(exstr = "") {
        this.lastExstr = exstr
        const [prefix] = this.splitOnPrefix(exstr)

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

        const currentGroup = await windowTgroup()
        const alternateGroup = await windowLastTgroup()
        const groups = [...(await tgroups())]
        this.options = await Promise.all(
            groups.map(async group => {
                const tabs = await tgroupTabs(group)
                const audible = tabs.some(t => t.audible)
                tabs.sort((a, b) => b.lastAccessed - a.lastAccessed)
                const urls = tabs.map(t => t.url)
                const o = new TabGroupCompletionOption(
                    group,
                    tabs.length,
                    group === currentGroup,
                    group === alternateGroup,
                    audible,
                    urls,
                )
                o.state = "normal"
                return o
            }),
        )
        this.completion = undefined
        return this.updateChain()
    }
}

import * as Completions from "@src/completions"
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
    ) {
        super()
        this.value = group
        this.fuseKeys.push(group)
        let pre = ""
        if (current) {
            pre += "%"
        }
        if (alternate) {
            pre += "#"
        }
        this.html = html`<tr class="TabGroupCompletionOption option">
            <td class="prefix">${pre}</td>
            <td class="title">${group}</td>
            <td class="tabcount">
                ${tabCount} tab${tabCount !== 1 ? "s" : ""}
            </td>
        </tr>`
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

    async filter(exstr: string) {
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

        return this.updateOptions(exstr)
    }

    private async updateOptions(exstr = "") {
        const [_prefix, query] = this.splitOnPrefix(exstr)
        const currentGroup = await windowTgroup()
        const alternateGroup = await windowLastTgroup()
        const groups = [...(await tgroups())].filter(
            group =>
                group.startsWith(query) ||
                (query === "#" && group === alternateGroup),
        )
        this.options = await Promise.all(
            groups.map(async group => {
                const tabCount = (await tgroupTabs(group)).length
                const o = new TabGroupCompletionOption(
                    group,
                    tabCount,
                    group === currentGroup,
                    group === alternateGroup,
                )
                o.state = "normal"
                return o
            }),
        )
        return this.updateDisplay()
    }
}

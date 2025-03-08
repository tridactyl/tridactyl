import * as Completions from "@src/completions"
import { browserBg } from "@src/lib/webext"

class TabHistoryCompletionOption
    extends Completions.CompletionOptionHTML
    implements Completions.CompletionOptionFuse {
    public fuseKeys = []

    constructor(public value: string, tab) {
        super()
        this.fuseKeys.push(this.value, tab.title)

        const index = tab.id ? tab.id : ""
        const timeSpan = tab.formatTimeSpan

        this.fuseKeys.push(String(index))

        this.html = html`<tr class="TabHistoryCompletionOption option">
            <td class="prefix">${index}</td>
            <td class="container"></td>
            <td class="title">${tab.prefix}${tab.title}</td>
            <td class="content">
                <a class="url" href="${tab.href}">${tab.href}</a>
            </td>
            <td class="time">${timeSpan}</td>
        </tr>`
    }
}

export class TabHistoryCompletionSource extends Completions.CompletionSourceFuse {
    public options: TabHistoryCompletionOption[]

    constructor(private _parent) {
        super(["back", "forward"], "TabHistoryCompletionSource", "Tab history")

        this.updateOptions()
        this._parent.appendChild(this.node)
    }

    async filter(exstr) {
        this.lastExstr = exstr
        return this.onInput(exstr)
    }

    async onInput(exstr) {
        return this.updateOptions(exstr)
    }

    private makeTree(nodes, parentId = null, level = 0) {
        return nodes
            .filter(node => node["parent"] === parentId)
            .reduce(
                (tree, node) => [
                    ...tree,
                    {
                        ...node,
                        children: this.makeTree(nodes, node["id"], level + 1),
                        level,
                    },
                ],
                [],
            )
    }

    private flattenTree(node, flat = []) {
        flat.push({
            title: node["title"],
            href: node["href"],
            parent: node["parent"],
            id: node["id"],
            level: node["level"] === 0 ? node["level"] : node["level"] - 1,
            time: node["time"],
        })
        for (const child of node["children"]) {
            this.flattenTree(child, flat)
        }
        return flat
    }

    private addFormatTimeSpan(tree) {
        const now = Date.now()
        for (const node of tree) {
            const past = now - node["time"]
            node["formatTimeSpan"] = this.formatTimeSpan(past)
        }
    }
    private formatTimeSpan(ms) {
        const s = Math.floor(ms / 1000)
        const m = Math.floor(s / 60)
        const h = Math.floor(m / 60)
        const day = Math.floor(h / 24)

        if (m < 1) return `${s} second${s == 1 ? "" : "s"} ago`
        else if (m < 10) return `${m}m ${s % 60}s ago`
        else if (h < 1) return `${m} min${m == 1 ? "" : "s"} ago`
        else if (h < 10) return `${h}h ${m % 60}m ago`
        else if (day < 1) return `${h} hour${h == 1 ? "" : "s"} ago`
        else if (day < 10)
            return `${day} day${day == 1 ? "" : "s"} ${h % 24}h ago`
        else return `${day} day${day == 1 ? "" : "s"} ago`
    }

    private addIndicies(tree) {
        for (const node of tree) {
            const parentCount = node["level"]
            let string = "  "
            for (let i = 0; i <= parentCount; ++i) {
                if (i === parentCount - 1) {
                    string += "┌─"
                } else if ( i < parentCount ) {
                    string += "  " // NB: non-breaking space
                } else {
                    string += "· "
                }
            }
            node["prefix"] = string
        }
    }

    private async updateOptions(exstr = "") {
        this.lastExstr = exstr

        const tab = await browserBg.tabs.query({
            active: true,
            currentWindow: true,
        })
        let history = await browserBg.sessions.getTabValue(tab[0].id, "history")
        if (!history) history = { list: [] }
        const tree = this.makeTree(history["list"])
        if (tree.length > 0) {
            history["list"] = this.flattenTree(tree[0]).reverse()
        }
        this.addIndicies(history["list"])
        this.addFormatTimeSpan(history["list"])

        this.options = this.scoreOptions(
            history["list"].map(
                item =>
                    new TabHistoryCompletionOption(item.href, {
                        href: item.href,
                        id: item.index,
                        title: item.title,
                        prefix: item.prefix,
                        index: item.level,
                        formatTimeSpan: item.formatTimeSpan,
                    }),
            ),
        )
        this.updateChain()
    }

    private scoreOptions(options: TabHistoryCompletionOption[]) {
        return options
    }
}

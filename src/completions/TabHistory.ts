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

        this.fuseKeys.push(String(index))

        this.html = html`<tr class="TabHistoryCompletionOption option">
            <td class="prefix">${index}</td>
            <td class="container"></td>
            <td class="title">${tab.prefix}${tab.title}</td>
            <td class="content">
                <a class="url" href="${tab.href}">${tab.href}</a>
            </td>
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

    private traverseChildren(tree, node) {
        for (const child of node["children"]) {
            const newNode = tree[child]
            this.traverseChildren(tree, newNode)
            this.addIndex(tree, newNode)
        }
    }

    private addIndex(tree, node) {
        const parentCount = this.countParents(tree, node)
        node["index"] = parentCount
        let string = ""
        for (let i = 0; i <= parentCount; ++i) {
            if (i === parentCount) {
                string += "├─"
            } else if (i === 0) {
                string += "| "
            } else {
                string += "| "
            }
        }
        node["prefix"] = string
    }

    private countParents(tree, node): number {
        let prev = null
        if (tree[node["parent"]]) prev = tree[node["parent"]]
        let counter = 0
        while (prev) {
            prev = tree[prev["parent"]]
            counter += 1
        }
        return counter - 1
    }

    private async updateOptions(exstr = "") {
        this.lastExstr = exstr

        const tab = await browserBg.tabs.query({
            active: true,
            currentWindow: true,
        })
        let history = await browserBg.sessions.getTabValue(tab[0].id, "history")
        if (!history) history = { list: [] }

        let jump = history["list"][history["current"]]
        let counter = 0
        if (jump) {
            history["list"][history["current"]]["index"] = "%"
            history["list"][history["current"]]["prefix"] = "|"
        }
        while (jump && history["list"][jump["parent"]]) {
            counter -= 1
            history["list"][jump["parent"]]["index"] = counter
            history["list"][jump["parent"]]["prefix"] = "|"
            jump = history["list"][jump["parent"]]
        }
        jump = history["list"][history["current"]]

        this.traverseChildren(history["list"], jump)

        history["list"] = history["list"].filter(el =>
            Object.prototype.hasOwnProperty.call(el, "index"),
        )

        this.options = this.scoreOptions(
            history["list"].map(
                item =>
                    new TabHistoryCompletionOption(item.href, {
                        href: item.href,
                        id: item.index,
                        title: item.title,
                        prefix: item.prefix,
                        index: item.index,
                    }),
            ),
        )
        this.updateChain()
    }

    private scoreOptions(options: TabHistoryCompletionOption[]) {
        options.sort((el1, el2) => {
            if (el1["index"] && el2["index"] && el1["index"] < el2["index"])
                return -1
            if (el1["index"] && el2["index"] && el1["index"] > el2["index"])
                return 1
            if (el1["parent"] && el2["parent"] && el1["parent"] < el2["parent"])
                return -1
            if (el1["parent"] && el2["parent"] && el1["parent"] > el2["parent"])
                return 1
            return 0
        })
        return options
    }
}

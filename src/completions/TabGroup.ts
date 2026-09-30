import * as Completions from "@src/completions"
import * as config from "@src/lib/config"
import { activeWindowId, browserBg } from "@src/lib/webext"
import {
    hasNativeTabGroups,
    tgroups,
    windowTgroup,
    windowLastTgroup,
    tgroupTabs,
} from "@src/lib/tab_groups"
import { TabCompletionSource } from "@src/completions/TabBase"

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
        this.html.lastElementChild.querySelectorAll(".url").forEach(
            (link, index) => (link.textContent = Completions.decodeUrlForDisplay(urls[index])),
        )
    }
}

export class TabGroupCompletionSource extends TabCompletionSource {
    public options: TabGroupCompletionOption[]
    private unfilteredOptions: TabGroupCompletionOption[]
    private shouldSetStateFromScore = true

    constructor(private _parent: any) {
        super(
            ["tgroupswitch", "tgroupmove", "tgroupattach", "tgroupclose", "tgroupcollapse", "tgroupexpand", "tgrouptoggle", "tgroupmovegroup"],
            "TabGroupCompletionSource",
            "Tab Groups",
        )

        this.updateOptions()
        this._parent.appendChild(this.node)
        this.shouldSetStateFromScore =
            config.get("completions", "TabGroup", "autoselect") === "true"
        this.listenForTabChanges()
    }

    async onInput(exstr) {
        return this.updateOptions(exstr)
    }

    setStateFromScore(scoredOpts: Completions.ScoredOption[]) {
        super.setStateFromScore(scoredOpts, this.shouldSetStateFromScore)
    }

    protected refreshForTabChanges() {
        return this.updateOptions(this.lastExstr)
    }

    /** Native snapshot: two Firefox queries, everything else local. */
    private async fillNativeOptions() {
        const windowId = await activeWindowId()
        const [nativeGroups, tabs] = await Promise.all([
            browserBg.tabGroups.query({ windowId }),
            browserBg.tabs.query({ windowId }),
        ])
        const groups = nativeGroups.filter(g => g.title)
        const titleById = new Map<number, string>()
        const tabsByTitle = new Map<string, browser.tabs.Tab[]>()
        for (const group of groups) {
            titleById.set(group.id, group.title)
            tabsByTitle.set(group.title, [])
        }
        let activeGroupId: number | undefined
        for (const tab of tabs) {
            const title = titleById.get(tab.groupId)
            if (title !== undefined) tabsByTitle.get(title).push(tab)
            if (tab.active) activeGroupId = tab.groupId
        }
        const currentGroup = titleById.get(activeGroupId)
        // Most recently used group other than the current one, mirroring
        // windowLastTgroup() without its per-group queries.
        let alternateGroup: string | undefined
        let alternateLastAccessed = 0
        for (const [title, groupTabs] of tabsByTitle) {
            if (title === currentGroup || groupTabs.length === 0) continue
            const lastAccessed = Math.max(
                ...groupTabs.map(t => t.lastAccessed || 0),
            )
            if (lastAccessed > alternateLastAccessed) {
                alternateLastAccessed = lastAccessed
                alternateGroup = title
            }
        }
        return groups.map(group => {
            const groupTabs = tabsByTitle.get(group.title)
            groupTabs.sort((a, b) => b.lastAccessed - a.lastAccessed)
            const o = new TabGroupCompletionOption(
                group.title,
                groupTabs.length,
                group.title === currentGroup,
                group.title === alternateGroup,
                groupTabs.some(t => t.audible),
                groupTabs.map(t => t.url),
            )
            o.state = "normal"
            return o
        })
    }

    private async fillLegacyOptions() {
        const currentGroup = await windowTgroup()
        const alternateGroup = await windowLastTgroup()
        const groups = [...(await tgroups())]
        return Promise.all(
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
    }

    private async updateOptions(exstr = "") {
        const generation = this.beginUpdate()
        this.lastExstr = exstr
        const [prefix] = this.splitOnPrefix(exstr)

        // Hide self and stop if prefixes don't match
        const wasHidden = this.state === "hidden"
        if (prefix) {
            // Show self if prefix and currently hidden
            if (this.state === "hidden") {
                this.state = "normal"
            }
        } else {
            this.state = "hidden"
            return
        }

        // While the completion UI stays open, typing only re-filters the
        // cached option list instead of re-querying Firefox per keystroke.
        if (!this.optionsDirty && !wasHidden) {
            this.options = this.unfilteredOptions
            this.completion = undefined
            return this.updateChain()
        }

        let options: TabGroupCompletionOption[]
        if (hasNativeTabGroups()) {
            options = await this.fillNativeOptions()
        } else {
            options = await this.fillLegacyOptions()
        }
        if (!options || !this.isCurrentUpdate(generation)) return
        this.unfilteredOptions = options
        this.options = this.unfilteredOptions
        this.optionsDirty = false
        this.completion = undefined
        return this.updateChain()
    }
}

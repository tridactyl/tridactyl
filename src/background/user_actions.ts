/*
 * 🎶 No alarms and no surprises 🎶
 * 🎶 No alarms and no surprises 🎶
 * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/User_actions
 */

import * as excmds from "@src/.excmds_background.generated"
import * as R from "ramda"
import * as config from "@src/lib/config"
import { getTridactylTabs } from "@src/background/meta"

function escapehatch() {
    if (config.get("escapehatchsidebarhack") == "true") {
        // Only works if called via commands API command - fail silently if called otherwise
        browser.sidebarAction.open().catch()
        browser.sidebarAction.close().catch()
    }
    ;(async () => {
        const tabs = await browser.tabs.query({ currentWindow: true })
        const tridactyl_tabs = await getTridactylTabs(tabs)
        const curr_pos = tabs.filter(t => t.active)[0].index

        // If Tridactyl isn't running in any tabs in the current window open a new tab
        if (tridactyl_tabs.length == 0) return excmds.tabopen()

        const best = R.sortBy(
            tab => Math.abs(tab.index - curr_pos),
            tridactyl_tabs,
        )[0]

        if (best.active) {
            return excmds.unfocus()
        }

        return browser.tabs.update(best.id, { active: true })
    })()
}

/**
 * Toggle the sidebar. Bind with e.g. `:bind --mode=browser <C-.> sidebartoggle`
 */
function sidebartoggle() {
    return browser.sidebarAction.toggle()
}

function jsua(...args: string[]) {
    return eval(args.join(" "))
}

export const useractions: Record<string, (...args: string[]) => void> = {
    escapehatch,
    sidebartoggle,
    jsua,
}

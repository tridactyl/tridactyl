const UPDATE_PENDING = 1
const PRIORITY_PENDING = 2
let tabChanges = 0
let sendingTabChanges: Promise<void>
export function messageTabChanges(command: string) {
    // eslint-disable-next-line no-bitwise -- FIX: bitmask, not a typo for ||=
    tabChanges |=
        /^tab_(?:close|created|moved|activated|attached|detached)$/u.test(
            command,
        )
            ? PRIORITY_PENDING
            : UPDATE_PENDING
    sendingTabChanges ||= new Promise<void>(resolve =>
        setTimeout(resolve, 0),
    ).then(async () => {
        while (tabChanges) {
            const changes = tabChanges
            tabChanges = 0
            // eslint-disable-next-line no-bitwise -- FIX: bitmask, not a typo for &&
            const priority = changes & PRIORITY_PENDING
            const tabs = await browser.tabs
                .query({ active: true })
                .catch(() => [])
            await Promise.all(
                tabs.map(tab =>
                    browser.tabs
                        .sendMessage(tab.id, {
                            type: "tab_changes",
                            command: priority ? "priority" : "updated",
                        })
                        .catch(() => undefined),
                ),
            )
        }
        sendingTabChanges = undefined
    })
}

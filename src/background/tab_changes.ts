enum PendingChange {
    None,
    Update,
    Priority,
}
let tabChanges = PendingChange.None
let sendingTabChanges: Promise<void>
export function messageTabChanges(command: string) {
    if (tabChanges !== PendingChange.Priority) {
        tabChanges =
            /^tab_(?:close|created|moved|activated|attached|detached)$/u.test(command)
                ? PendingChange.Priority
                : PendingChange.Update
    }
    sendingTabChanges ||= new Promise<void>(resolve =>
        setTimeout(resolve, 0),
    ).then(async () => {
        while (tabChanges !== PendingChange.None) {
            const priority = tabChanges === PendingChange.Priority
            tabChanges = PendingChange.None
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

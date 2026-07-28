const tabChanges: [string, any[]][] = []
let sendingTabChanges: Promise<void>
export function messageTabChanges(command: string, args: any[]) {
    tabChanges.push([command, args])
    sendingTabChanges ||=
        new Promise<void>(resolve => setTimeout(resolve, 0)).then(async () => {
            while (tabChanges.length) {
                const batch = tabChanges.splice(0)
                await browser.runtime
                    .sendMessage({
                        type: "tab_changes",
                        command: "batch",
                        args: [batch],
                    })
                    .catch(() => undefined)
            }
            sendingTabChanges = undefined
        })
}

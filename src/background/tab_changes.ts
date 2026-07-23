import { messageActiveTab as send } from "@src/lib/messaging"
const tabChanges: [string, any[]][] = []
let sendingTabChanges: Promise<void>
export function messageTabChanges(command: string, args: any[]) {
    tabChanges.push([command, args])
    sendingTabChanges ||=
        new Promise<void>(resolve => setTimeout(resolve, 0)).then(async () => {
            while (tabChanges.length) {
                const batch = tabChanges.splice(0)
                await send("tab_changes", "batch", [batch]).catch(
                    () => undefined,
                )
            }
            sendingTabChanges = undefined
        })
}

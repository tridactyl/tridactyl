import { useractions } from "@src/background/user_actions"
import * as config from "@src/lib/config"
import * as keyseq from "@src/lib/keyseq"
import * as controller from "@src/lib/controller"

function makelistener(commands: Array<browser.commands.Command>) {
    return (command_name: string) => {
        const command = commands.filter(c => c.name == command_name)[0]
        const [excmd, ...exargs] = config
            .get(
                "browsermaps",
                keyseq.mozMapToMinimalKey(command.shortcut).toMapstr(),
            )
            .split(" ")
        if (excmd in useractions) return useractions[excmd](...exargs)
        return controller.acceptExCmd([excmd, ...exargs].join(" "))
    }
}

let listener

export async function updateListener() {
    listener !== undefined &&
        browser.commands.onCommand.removeListener(listener)
    listener = makelistener(await browser.commands.getAll())
    browser.commands.onCommand.addListener(listener)
    return listener
}

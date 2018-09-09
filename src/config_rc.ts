import * as controller from "./controller"
import * as Native from "./native_background"
import * as excmds from "./.excmds_background.generated"
import Logger from "./logging"
const logger = new Logger("rc")

export async function source(filename = "auto") {
    let rctext = ""
    if (filename == "auto") {
        rctext = await Native.getrc()
    } else {
        rctext = (await Native.read(filename)).content
    }
    if (rctext === undefined) return false
    runRc(rctext)
    return true
}

export async function runRc(rc: string) {
    for (let cmd of rcFileToExCmds(rc)) {
        await controller.acceptExCmd(cmd, excmds)
    }
}

export function rcFileToExCmds(rcText: string): string[] {
    const excmds = rcText.split("\n")

    // Remove empty and comment lines
    return excmds.filter(x => /\S/.test(x) && !x.trim().startsWith('"'))
}

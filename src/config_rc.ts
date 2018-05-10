import * as Controller from "./controller"
import * as Native from "./native_background"
import Logger from "./logging"
const logger = new Logger("rc")

export async function source(filename = "auto") {
    let rctext = ""
    if (filename == "auto") {
        rctext = await Native.getrc()
    } else {
        rctext = (await Native.read(filename)).content
    }

    runRc(rctext)
}

export async function runRc(rc: string) {
    for (let cmd of rcFileToExCmds(rc)) {
        await Controller.acceptExCmd(cmd)
    }
}

export function rcFileToExCmds(rcText: string): string[] {
    const excmds = rcText.split("\n")

    // Remove comment lines
    return excmds.filter(x => x != "" && !x.trim().startsWith('"'))
}

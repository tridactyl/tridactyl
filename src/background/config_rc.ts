import * as controller from "@src/lib/controller"
import * as Native from "@src/lib/native"

export async function source(filename = "auto") {
    let rctext = ""
    if (filename === "auto") {
        rctext = await Native.getrc()
    } else {
        rctext = (await Native.read(filename)).content
    }
    if (rctext === undefined) return false
    await runRc(rctext)
    return true
}

/*
 * This should be moved out to a library but I am lazy
 */
export async function fetchText(url: string) {
    const response = await fetch(url)
    const reader = response.body.getReader()
    let rctext = ""
    const decoder = new TextDecoder("utf-8")
    while (true) {
        const { value: chunk, done: isDone } = await reader.read()
        if (isDone) return rctext
        rctext += decoder.decode(chunk)
    }
}
const fetchConfig = fetchText

export async function sourceFromUrl(url: string) {
    const rctext = await fetchConfig(url)
    if (!rctext) return false
    await runRc(rctext)
    return true
}

export async function writeRc(conf: string, force = false, filename = "auto") {
    let path: string
    if (filename === "auto") {
        try {
            path = await Native.getrcpath()
        } catch (e) {
            // TODO: respect XDG_CONFIG_DIR without breaking on systems that don't have it set
            path = "~/.tridactylrc"
        }
    } else {
        path = filename
    }
    return await Native.writerc(path, force, conf)
}

export async function runRc(rc: string) {
    for (const cmd of rcFileToExCmds(rc)) {
        await new Promise(resolve => setTimeout(resolve, 100))
        await controller.acceptExCmd(cmd)
    }
}

export function rcFileToExCmds(rcText: string): string[] {
    // Split into individual excmds
    const excmds = rcText.split("\n")

    // Remove empty and comment lines
    const ex = excmds.filter(
        x =>
            /\S/.test(x) &&
            !x.trim().startsWith('"') &&
            !x.trim().startsWith("#"),
    )
    const res = ex.join("\n")

    // string-join lines that end with /
    const joined = res.replace(/\\\n/g, "")

    return joined.split("\n")
}

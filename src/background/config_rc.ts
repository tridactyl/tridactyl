import * as controller from "@src/lib/controller"
import { ExCommand } from "@src/lib/excmd"
import * as Native from "@src/lib/native"
import { parseStructure } from "@src/parsers/exdsl"

const isBlankOrComment = (line: string) => /^\s*(?:["#]|$)/.test(line)

const commandVersion = (source: string) =>
    /^set\s+exversion\s+([12])$/.exec(source.trim())?.[1]

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
    let error
    for (const cmd of rcFileToExCmds(rc))
        error = await controller.acceptExCmd(cmd).then(
            () => undefined,
            e => e,
        )
    if (error) throw error
}

export function* rcFileToExCmds(rcText: string): IterableIterator<ExCommand> {
    rcText = rcText.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n")
    let version: "1" | "2" = "1"
    let buffer = ""
    let continued = false
    for (const line of rcText.split("\n")) {
        if (version === "1") {
            if (isBlankOrComment(line)) continue
            continued = line.endsWith("\\")
            buffer += continued ? line.slice(0, -1) : line
            if (continued) continue
            yield buffer
            version = (commandVersion(buffer) as "1" | "2") || version
            buffer = ""
        } else {
            if (!buffer && isBlankOrComment(line)) continue
            buffer += (buffer ? "\n" : "") + line
            const status = parseStructure(buffer).status
            if (status === "incomplete") continue
            if (status === "invalid") throw new Error("invalid ex command")
            yield { source: buffer, exversion: 2 }
            version = (commandVersion(buffer) as "1" | "2") || version
            buffer = ""
        }
    }
    if (version === "1" && (buffer || continued))
        yield buffer + (continued ? "\\" : "")
    else if (buffer) throw new Error("incomplete ex command")
}

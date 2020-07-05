/** # Binding Functions
 *
 */

import { mapstrToKeyseq } from "@src/lib/keyseq"

export const mode2maps = new Map([
    ["normal", "nmaps"],
    ["ignore", "ignoremaps"],
    ["insert", "imaps"],
    ["input", "inputmaps"],
    ["ex", "exmaps"],
    ["hint", "hintmaps"],
    ["visual", "vmaps"],
])

export const maps2mode = new Map(
    Array.from(mode2maps.keys()).map(k => [mode2maps.get(k), k]),
)

export const modes = Array.from(mode2maps.keys())
export const modeMaps = Array.from(maps2mode.keys())

interface bind_args {
    mode: string
    configName: string
    key: string
    excmd: string
}

export function parse_bind_args(...args: string[]): bind_args {
    if (args.length === 0) throw new Error("Invalid bind/unbind arguments.")

    const result = {} as bind_args
    result.mode = "normal"

    if (args[0].startsWith("--mode=")) {
        result.mode = args.shift().replace("--mode=", "")
    }
    if (!mode2maps.has(result.mode)) {
        result.configName = result.mode + "maps"
    } else {
        result.configName = mode2maps.get(result.mode)
    }

    const key = args.shift()
    // Convert key to internal representation
    const keyseq = mapstrToKeyseq(key)
    result.key = keyseq.map(k => k.toMapstr()).join("")

    result.excmd = args.join(" ")

    // On second thought - I don't think we need this as browser.commands.update() will throw an error for us
    //
    // Check we have a Mozilla-compatible sequence for Commands binds
    // TODO: check that the key is compatible too
    // NB: +!! is a crazy way of coercing a boolean | undefined to a number
    // if (result.mode == "browser" && (
    //     keyseq.length > 1  ||
    //     [+!!keyseq[0].ctrlKey, +!!keyseq[0].altKey, +!!keyseq[0].shiftKey, +!!keyseq[0].metaKey].reduce((l,r) => Number(l) + Number(r)) < 1 ||
    //     [+!!keyseq[0].ctrlKey, +!!keyseq[0].altKey, +!!keyseq[0].shiftKey, +!!keyseq[0].metaKey].reduce((l,r) => Number(l) + Number(r)) > 2
    // )) throw "Error: Incompatible key sequence specified for 'browser' mode binds. Use one or two modifiers with a single key, e.g. <C-.>"

    return result
}

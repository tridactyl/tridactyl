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
    ["browser", "browsermaps"],
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

    return result
}

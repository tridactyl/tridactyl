/** # Binding Functions
 *
 */

import { canonicaliseMapstr } from "@src/lib/keyseq"

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
    isRecursive: boolean
}

export function parse_bind_args(...args: string[]): bind_args {
    if (args.length === 0) throw new Error("Invalid bind/unbind arguments.")

    const result = {} as bind_args
    result.mode = "normal"

    const flags = []; // --mode and --recursive
    while (args[0].startsWith("--")) {
        flags.push(args.shift());
    }

    for (const flag of flags) {
        if (flag.startsWith("--mode")) {
            result.mode = flag.replace("--mode=", "");
        } else if (flag == "--recursive") {
            result.isRecursive = true;
        } else {
            throw new Error("Invalid bind/unbind arguments.");
        }
    }

    if (!mode2maps.has(result.mode)) {
        result.configName = result.mode + "maps"
    } else {
        result.configName = mode2maps.get(result.mode)
    }

    const key = args.shift()
    // Convert key to internal representation
    result.key = canonicaliseMapstr(key)

    result.excmd = args.join(" ")

    return result
}

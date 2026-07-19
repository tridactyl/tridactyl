/** # Binding Functions
 *
 */

import { canonicaliseMapstr } from "@src/lib/keyseq"
import { ExCommand, joinExCommand } from "@src/lib/excmd"

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
    excmd: ExCommand
    isRecursive: boolean
}

export function parse_bind_args(...args: ExCommand[]): bind_args {
    if (args.length === 0) throw new Error("Invalid bind/unbind arguments.")

    const result = {} as bind_args
    result.mode = "normal"

    const flags: string[] = []; // --mode and --recursive
    while (typeof args[0] === "string" && args[0].startsWith("--")) {
        flags.push(args.shift() as string);
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
    if (typeof key !== "string") throw new Error("Invalid bind key.")
    // Convert key to internal representation
    result.key = canonicaliseMapstr(key)

    result.excmd = joinExCommand(args)

    return result
}

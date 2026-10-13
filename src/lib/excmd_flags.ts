/**
 * Shared helper for locating an excmd's `@flag` metadata.
 */

import * as Metadata from "@src/lib/metadata"
import type { FlagMeta } from "@src/lib/metadata"

export type { FlagMeta }

/** The `@flag` metadata map for a command, if any. */
export function flagsFor(
    cmdWord: string,
): Record<string, FlagMeta> | undefined {
    return Metadata.getFlags(Metadata.excmdsFunctions[cmdWord])
}

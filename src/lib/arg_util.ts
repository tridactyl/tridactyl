import arg from "tridactyl-arg"

/**
 * The arguments parsing library name
 */
export const name = "tridactyl-arg"

/**
 * The imported library itself
 */
export const lib = arg

/** Add defaults for options that were not parsed. */
export function withDefaults<T extends object, K extends keyof T>(
    options: T,
    defaults: Required<Pick<T, K>>,
): T & Required<Pick<T, K>> {
    const result = { ...defaults, ...options }
    for (const [key, value] of Object.entries(defaults)) {
        if (result[key] === undefined) result[key] = value
    }
    return result
}

/**
 * Small function to test if the double hyphen is the last option.
 * If a command does not expect empty arguments, and user just pass "--"
 * as a normal argument, this function cal tell it.
 */
export function isLastDoubleHyphen(argv: string[]): boolean {
    return argv[argv.length - 1] === "--"
}

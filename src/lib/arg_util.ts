import arg from "tridactyl-arg"

/**
 * The arguments parsing library name
 */
export const name = "tridactyl-arg"

/**
 * The imported library itself
 */
export const lib = arg

/**
 * Small function to test if the double hyphen is the last option.
 * If a command does not expect empty arguments, and user just pass "--"
 * as a normal argument, this function cal tell it.
 */
export function isLastDoubleHyphen(argv: string[]): boolean {
    return argv[argv.length - 1] === "--"
}

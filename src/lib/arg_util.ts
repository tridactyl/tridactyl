import arg from "arg"

/**
 * The arguments parsing library name
 */
export const name = "arg"

/**
 * The imported library itself
 */
export const lib = arg

/**
 * Function to easily allow some single hyphen prefix option
 * to be treated as long option too.
 *
 * E.g. correctSingleHyphen("-private https://some.url".split(" "), "-private")
 * will retrun "--private http://some.url".split(" "), which can be parsed
 * as a normal long option.
 */
export function correctSingleHyphen(
    argv: string[],
    ...singleNames: string[]
): string[] {
    return argv.map(arg => {
        const scan = /^-[\w-]{2,}/.exec(arg)
        if (!scan) return arg
        const index = singleNames.indexOf(scan[0])
        if (index === -1) return arg
        else return "-" + arg
    })
}

/**
 * Small function to test if the double hyphen is the last option.
 * If a command does not expect empty arguments, and user just pass "--"
 * as a normal argument, this function cal tell it.
 */
export function isLastDoubleHyphen(argv: string[]): boolean {
    return argv[argv.length - 1] === "--"
}

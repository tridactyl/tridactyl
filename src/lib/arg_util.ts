import arg from "tridactyl-arg"

/**
 * The arguments parsing library name
 */
export const name = "tridactyl-arg"

/**
 * The imported library itself
 */
export const lib = arg

type EdgeHandler = BooleanConstructor | NumberConstructor | StringConstructor
type EdgeSpec = Record<string, string | EdgeHandler>

/** Parse options in contiguous blocks at either edge of argv. */
export function parse<T extends EdgeSpec>(
    spec: T,
    {
        argv,
        missingValueErrors = {},
    }: { argv: string[]; missingValueErrors?: Record<string, string> },
): arg.Result<T> {
    const separator = argv.indexOf("--")
    const trailing = separator < 0 ? [] : argv.slice(separator + 1)
    argv = argv.slice(0, separator < 0 ? undefined : separator)

    const resolve = (name: string) => {
        let handler = spec[name]
        while (typeof handler === "string") {
            name = handler
            handler = spec[name]
        }
        return typeof handler === "function" ? { name, handler } : undefined
    }
    const identify = (token: string) => {
        if (token[0] !== "-") return undefined
        const equals = token.startsWith("--") ? token.indexOf("=") : -1
        const exact = resolve(equals < 0 ? token : token.slice(0, equals))
        if (exact)
            return {
                options: [exact],
                attached: equals < 0 ? undefined : token.slice(equals + 1),
            }
        if (equals < 0 && token[1] !== "-" && token.length > 2) {
            const options = [...token.slice(1)].map(char => resolve(`-${char}`))
            if (options.every(option => option !== undefined))
                return { options }
        }
        return undefined
    }

    const optionSize = (args: string[], index: number) => {
        const identified = identify(args[index])
        if (!identified) return 0
        const valueIndex = identified.options.findIndex(
            option => option.handler !== Boolean,
        )
        if (
            valueIndex < 0 ||
            valueIndex < identified.options.length - 1 ||
            identified.attached !== undefined
        )
            return 1
        const option = identified.options[valueIndex]
        const value = args[index + 1]
        return value !== undefined &&
            (value[0] !== "-" ||
                !identify(value) ||
                (option.handler === Number &&
                    /^-?\d*(\.(?=\d))?\d*$/.test(value)))
            ? 2
            : 1
    }

    let start = 0
    let size: number
    while (start < argv.length && (size = optionSize(argv, start)))
        start += size
    let end = argv.length
    while (end > start) {
        if (end - start > 1 && optionSize(argv, end - 2) === 2) end -= 2
        else if (optionSize(argv, end - 1) === 1) end--
        else break
    }
    const edges = argv.slice(0, start).concat(argv.slice(end))
    const positional = argv.slice(start, end).concat(trailing)
    const parsedSpec: arg.Spec = { ...spec }
    for (let i = 0; i < edges.length; i++) {
        if (
            edges[i][1] !== "-" &&
            edges[i].length > 2 &&
            typeof spec[edges[i]] === "string"
        )
            edges[i] = resolve(edges[i]).name
        const size = optionSize(edges, i)
        if (size === 2 && edges[i + 1][0] === "-") {
            const option = identify(edges[i]).options.find(
                option => option.handler !== Boolean,
            )
            // tridactyl-arg rejects separate values beginning with a hyphen.
            parsedSpec[option.name] = value =>
                option.handler(value[0] === "\0" ? value.slice(1) : value)
            i++
            edges[i] = `\0${edges[i]}`
        } else if (size === 2) {
            i++
        }
    }
    try {
        return arg(parsedSpec, {
            argv: edges.concat("--", positional),
            allowSingleHyphenLongOption: true,
        })
    } catch (error) {
        if (
            error instanceof arg.ArgError &&
            error.code.startsWith("ARG_MISSING_REQUIRED")
        ) {
            const source = /: (\S+)/.exec(error.message)?.[1]
            const canonical = source && resolve(source)?.name
            const custom =
                source &&
                (missingValueErrors[source] || missingValueErrors[canonical])
            if (custom) throw new Error(custom)
        }
        throw error
    }
}

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

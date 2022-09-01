import arg from "arg"

export const name = "arg"
export const lib = arg
export function correctSingleHyphen(argv, ...singleNames) {
    return argv.map(arg => {
        const scan = arg.match(/^-[\w-]{2,}/)
        if (!scan) return arg
        const index = singleNames.indexOf(scan[0])
        if (index === -1) return arg
        else return "-" + arg
    })
}
export function isLastDoubleHyphen(argv) {
    return argv.at(-1) === "--"
}

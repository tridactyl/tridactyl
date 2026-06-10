export function toBoolean(s: string) {
    if (s === "true") return true
    else if (s === "false") return false
    else throw new Error("Not a boolean")
}

export function toNumber(s: string) {
    const n = Number(s)
    if (isNaN(n)) throw new Error("Not a number! " + s)
    else return n
}

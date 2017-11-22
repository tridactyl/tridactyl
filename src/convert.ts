export function toBoolean(s: string) {
    if (s === "true") return true
    else if (s === "false") return false
    else throw "Not a boolean"
}

export function toNumber(s: string) {
    let n = Number(s)
    if (isNaN(n)) throw "Not a number! " + s
    else return n
}

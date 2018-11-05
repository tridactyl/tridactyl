import { Type } from "./Type"

export class NumberType implements Type {
    kind = "number"

    constructor() {}

    toConstructor() {
        return "new NumberType()"
    }

    toString() {
        return this.kind
    }

    convert(argument) {
        let n = parseInt(argument)
        if (!Number.isNaN(n)) return n
        n = parseFloat(argument)
        if (!Number.isNaN(n)) return n
        throw new Error(`Can't convert to number: ${argument}`)
    }
}

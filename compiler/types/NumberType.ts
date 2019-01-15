import { Type } from "./Type"

export class NumberType implements Type {
    static instance = new NumberType()
    kind = "number"

    constructor() {}

    toConstructor() {
        return "NumberType.instance"
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

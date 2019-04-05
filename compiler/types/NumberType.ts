import { Type } from "./Type"

export class NumberType implements Type {
    public static instance = new NumberType()
    public kind = "number"

    public toConstructor() {
        return "NumberType.instance"
    }

    public toString() {
        return this.kind
    }

    public convert(argument) {
        let n = parseInt(argument, 10)
        if (!Number.isNaN(n)) {
            return n
        }
        n = parseFloat(argument)
        if (!Number.isNaN(n)) {
            return n
        }
        throw new Error(`Can't convert to number: ${argument}`)
    }
}

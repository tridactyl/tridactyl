import { Type } from "./Type"

export class NumberType implements Type {
    public kind = "number"

    public constructor(public isDotDotDot = false, public isQuestion = false) {}

    public toConstructor() {
        return `new NumberType(${this.isDotDotDot}, ${this.isQuestion})`
    }

    public toString() {
        return this.kind
    }

    public convert(argument) {
        const n = parseFloat(argument)
        if (!Number.isNaN(n)) {
            return n
        }
        throw new Error(`Can't convert to number: ${argument}`)
    }
}

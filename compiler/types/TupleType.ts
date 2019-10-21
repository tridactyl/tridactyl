import { Type } from "./Type"

export class TupleType implements Type {
    public kind = "tuple"

    constructor(public elemTypes: Type[], public isDotDotDot = false, public isQuestion = false) {}

    public toConstructor() {
        return (
            `new TupleType([` +
            // Convert every element type to its constructor representation
            this.elemTypes.map(cur => cur.toConstructor()).join(",\n") +
            `], ${this.isDotDotDot}, ${this.isQuestion})`
        )
    }

    public toString() {
        return `[${this.elemTypes.map(e => e.toString()).join(", ")}]`
    }

    public convert(argument) {
        if (!Array.isArray(argument)) {
            try {
                argument = JSON.parse(argument)
            } catch (e) {
                throw new Error(`Can't convert to tuple: ${argument}`)
            }
            if (!Array.isArray(argument)) {
                throw new Error(`Can't convert to tuple: ${argument}`)
            }
        }
        if (argument.length !== this.elemTypes.length) {
            throw new Error(
                `Error converting tuple: number of elements and type mismatch ${argument}`,
            )
        }
        return argument.map((v, i) => this.elemTypes[i].convert(v))
    }
}

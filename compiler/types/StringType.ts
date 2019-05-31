import { Type } from "./Type"

export class StringType implements Type {
    public kind = "string"

    constructor(public isDotDotDot = false, public isQuestion = false) {}

    public toConstructor() {
        return `new StringType(${this.isDotDotDot}, ${this.isQuestion})`
    }

    public toString() {
        return this.kind
    }

    public convert(argument) {
        if (typeof argument === "string") {
            return argument
        }
        throw new Error(`Can't convert to string: ${argument}`)
    }
}

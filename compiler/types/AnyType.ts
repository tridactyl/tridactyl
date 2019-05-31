import { Type } from "./Type"

export class AnyType implements Type {
    public kind = "any"

    constructor(public isDotDotDot = false, public isQuestion = false) {}

    public toConstructor() {
        return `new AnyType(${!this.isDotDotDot}, ${this.isQuestion})`
    }

    public toString() {
        return this.kind
    }

    public convert(argument) {
        return argument
    }
}

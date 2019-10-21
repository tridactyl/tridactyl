import { Type } from "./Type"

export class VoidType implements Type {
    public kind = "void"

    constructor(public isDotDotDot = false, public isQuestion = false) {}

    public toConstructor() {
        return `new VoidType(${this.isDotDotDot}, ${this.isQuestion})`
    }

    public toString() {
        return this.kind
    }

    public convert(argument) {
        return null
    }
}

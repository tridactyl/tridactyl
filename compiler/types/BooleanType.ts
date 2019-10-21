import { Type } from "./Type"

export class BooleanType implements Type {
    public kind = "boolean"

    constructor(public isDotDotDot = false, public isQuestion = false) {}

    public toConstructor() {
        return `new BooleanType(${this.isDotDotDot}, ${this.isQuestion})`
    }

    public toString() {
        return this.kind
    }

    public convert(argument) {
        if (argument === "true") {
            return true
        } else if (argument === "false") {
            return false
        }
        throw new Error("Can't convert ${argument} to boolean")
    }
}

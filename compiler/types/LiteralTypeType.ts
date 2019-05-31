import { Type } from "./Type"

export class LiteralTypeType implements Type {
    public kind = "LiteralType"

    constructor(public value: string, public isDotDotDot = false, public isQuestion = false) {}

    public toConstructor() {
        return `new LiteralTypeType(${JSON.stringify(this.value)}, ${this.isDotDotDot}, ${this.isQuestion})`
    }

    public toString() {
        return JSON.stringify(this.value)
    }

    public convert(argument) {
        if (argument === this.value) {
            return argument
        }
        throw new Error(
            `Argument does not match expected value (${
                this.value
            }): ${argument}`,
        )
    }
}

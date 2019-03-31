import { Type } from "./Type"

export class LiteralTypeType implements Type {
    public kind = "LiteralType"

    constructor(public value: string) {}

    public toConstructor() {
        return `new LiteralTypeType(${JSON.stringify(this.value)})`
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

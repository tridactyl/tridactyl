import { Type } from "./Type"

export class LiteralTypeType implements Type {
    kind = "LiteralType"

    constructor(public value: string) {}

    toConstructor() {
        return `new LiteralTypeType(${JSON.stringify(this.value)})`
    }

    toString() {
        return JSON.stringify(this.value)
    }

    convert(argument) {
        if (argument === this.value) return argument
        throw new Error(
            `Argument does not match expected value (${
                this.value
            }): ${argument}`,
        )
    }
}

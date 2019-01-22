import { Type } from "./Type"

export class StringType implements Type {
    static instance = new StringType()
    kind = "string"

    constructor() {}

    toConstructor() {
        return "StringType.instance"
    }

    toString() {
        return this.kind
    }

    convert(argument) {
        if (typeof argument === "string") return argument
        throw new Error(`Can't convert to string: ${argument}`)
    }
}

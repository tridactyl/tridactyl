import { Type } from "./Type"

export class StringType implements Type {
    kind = "string"

    constructor() {}

    toConstructor() {
        return "new StringType()"
    }

    toString() {
        return this.kind
    }

    convert(argument) {
        if (typeof argument === "string") return argument
        throw new Error(`Can't convert to string: ${argument}`)
    }
}

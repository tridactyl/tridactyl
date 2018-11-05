import { Type } from "./Type"

export class BooleanType implements Type {
    kind = "boolean"

    constructor() {}

    toConstructor() {
        return "new BooleanType()"
    }

    toString() {
        return this.kind
    }

    convert(argument) {
        if (argument === "true") return true
        else if (argument === "false") return false
        throw new Error("Can't convert ${argument} to boolean")
    }
}

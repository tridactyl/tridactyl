import { Type } from "./Type"

export class AnyType implements Type {
    kind = "any"

    constructor() {}

    toConstructor() {
        return "new AnyType()"
    }

    toString() {
        return this.kind
    }

    convert(argument) {
        return argument
    }
}

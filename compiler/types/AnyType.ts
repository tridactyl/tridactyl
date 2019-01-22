import { Type } from "./Type"

export class AnyType implements Type {
    static instance = new AnyType()
    kind = "any"

    constructor() {}

    toConstructor() {
        return "AnyType.instance"
    }

    toString() {
        return this.kind
    }

    convert(argument) {
        return argument
    }
}

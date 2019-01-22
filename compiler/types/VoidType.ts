import { Type } from "./Type"

export class VoidType implements Type {
    static instance = new VoidType()
    kind = "void"

    constructor() {}

    toConstructor() {
        return "VoidType.instance"
    }

    toString() {
        return this.kind
    }

    convert(argument) {
        return null
    }
}

import { Type } from "./Type"

export class VoidType implements Type {
    kind = "void"

    constructor() {}

    toConstructor() {
        return "new VoidType()"
    }

    toString() {
        return this.kind
    }

    convert(argument) {
        return null
    }
}

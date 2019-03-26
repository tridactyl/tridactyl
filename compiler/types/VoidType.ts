import { Type } from "./Type"

export class VoidType implements Type {
    public static instance = new VoidType()
    public kind = "void"

    constructor() {}

    public toConstructor() {
        return "VoidType.instance"
    }

    public toString() {
        return this.kind
    }

    public convert(argument) {
        return null
    }
}

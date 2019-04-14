import { Type } from "./Type"

export class VoidType implements Type {
    public static instance = new VoidType()
    public kind = "void"

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

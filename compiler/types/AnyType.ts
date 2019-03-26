import { Type } from "./Type"

export class AnyType implements Type {
    public static instance = new AnyType()
    public kind = "any"

    public toConstructor() {
        return "AnyType.instance"
    }

    public toString() {
        return this.kind
    }

    public convert(argument) {
        return argument
    }
}

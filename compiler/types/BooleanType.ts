import { Type } from "./Type"

export class BooleanType implements Type {
    public static instance = new BooleanType()
    public kind = "boolean"

    public toConstructor() {
        return "BooleanType.instance"
    }

    public toString() {
        return this.kind
    }

    public convert(argument) {
        if (argument === "true") {
            return true
        } else if (argument === "false") {
            return false
        }
        throw new Error("Can't convert ${argument} to boolean")
    }
}

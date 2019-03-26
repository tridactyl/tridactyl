import { Type } from "./Type"

export class StringType implements Type {
    public static instance = new StringType()
    public kind = "string"

    constructor() {}

    public toConstructor() {
        return "StringType.instance"
    }

    public toString() {
        return this.kind
    }

    public convert(argument) {
        if (typeof argument === "string") {
            return argument
        }
        throw new Error(`Can't convert to string: ${argument}`)
    }
}

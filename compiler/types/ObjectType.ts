import { Type } from "./Type"

export class ObjectType implements Type {
    kind = "object"

    constructor() {}

    toConstructor() {
        return "new ObjectType()"
    }

    toString() {
        return this.kind
    }

    convert(argument) {
        try {
            return JSON.parse(argument)
        } catch (e) {
            throw new Error(`Can't convert to object: ${argument}`)
        }
    }
}

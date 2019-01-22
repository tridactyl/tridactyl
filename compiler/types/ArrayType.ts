import { Type } from "./Type"

export class ArrayType implements Type {
    kind = "array"

    constructor(public elemType: Type) {}

    toConstructor() {
        return `new ArrayType(${this.elemType.toConstructor()})`
    }

    toString() {
        return `${this.elemType.toString()}[]`
    }

    convert(argument) {
        if (!Array.isArray(argument)) {
            try {
                argument = JSON.parse(argument)
            } catch (e) {
                throw new Error(`Can't convert ${argument} to array:`)
            }
            if (!Array.isArray(argument)) {
                throw new Error(`Can't convert ${argument} to array:`)
            }
        }
        return argument.map(v => this.elemType.convert(v))
    }
}

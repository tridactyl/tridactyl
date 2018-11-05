import { Type } from "./Type"

export class TypeReferenceType implements Type {
    constructor(public kind: string, public args: Type[]) {}

    toConstructor() {
        return (
            `new TypeReferenceType(${JSON.stringify(this.kind)}, [` +
            // Turn every type argument into its constructor representation
            this.args.map(cur => cur.toConstructor()).join(",\n") +
            `])`
        )
    }

    toString() {
        return `${this.kind}<${this.args.map(a => a.toString()).join(", ")}>`
    }

    convert(argument) {
        throw new Error("Conversion of simple type references not implemented.")
    }
}

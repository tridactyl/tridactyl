import { Type } from "./Type"

export class TypeReferenceType implements Type {
    public constructor(public kind: string, public args: Type[], public isDotDotDot = false, public isQuestion = false) {}

    public toConstructor() {
        return (
            `new TypeReferenceType(${JSON.stringify(this.kind)}, [` +
            // Turn every type argument into its constructor representation
            this.args.map(cur => cur.toConstructor()).join(",\n") +
            `], ${this.isDotDotDot}, ${this.isQuestion})`
        )
    }

    public toString() {
        return `${this.kind}<${this.args.map(a => a.toString()).join(", ")}>`
    }

    public convert(argument) {
        throw new Error("Conversion of simple type references not implemented.")
    }
}

import { Type } from "./Type"

export class UnionType implements Type {
    public kind = "union"

    constructor(public types: Type[]) {}

    public toConstructor() {
        return (
            `new UnionType([` +
            // Convert every type to its string constructor representation
            this.types.map(cur => cur.toConstructor()).join(",\n") +
            `])`
        )
    }

    public toString() {
        return this.types.map(t => t.toString()).join(" | ")
    }

    public convert(argument) {
        for (const t of this.types) {
            try {
                return t.convert(argument)
            } catch (e) {}
        }
        throw new Error(`Can't convert "${argument}" to any of: ${this.types}`)
    }
}

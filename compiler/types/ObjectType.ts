import { Type } from "./Type"

export class ObjectType implements Type {
    public kind = "object"

    // Note: a map that has an empty key ("") uses the corresponding type as default type
    constructor(public members: Map<string, Type> = new Map<string, Type>()) {}

    public toConstructor() {
        return `new ObjectType(new Map<string, Type>([` +
            Array.from(this.members.entries()).map(([n, m]) => `[${JSON.stringify(n)}, ${m.toConstructor()}]`)
            .join(", ") +
        `]))`
    }

    public toString() {
        return this.kind
    }

    public convertMember(memberName: string[], memberValue: string) {
        let type = this.members.get(memberName[0])
        if (!type) {
            // No type, try to get the default type
            type = this.members.get("")
            if (!type) {
                // No info for this member and no default type, anything goes
                return memberValue
            }
        }
        if (type.kind === "object") {
            return (type as ObjectType).convertMember(memberName.slice(1), memberValue)
        }
        return type.convert(memberValue)
    }

    public convert(argument) {
        try {
            return JSON.parse(argument)
        } catch (e) {
            throw new Error(`Can't convert to object: ${argument}`)
        }
    }
}

import { Type } from "../types/AllTypes"
import { SymbolMetadata } from "./SymbolMetadata"

export class ClassMetadata {
    constructor(
        public members: Map<string, SymbolMetadata> = new Map<
            string,
            SymbolMetadata
        >(),
    ) {}

    setMember(name: string, s: SymbolMetadata) {
        this.members.set(name, s)
    }

    getMember(name: string) {
        return this.members.get(name)
    }

    getMembers() {
        return this.members.keys()
    }

    toConstructor() {
        return (
            `new ClassMetadata(new Map<string, SymbolMetadata>([` +
            Array.from(this.members.entries())
                .map(([n, m]) => `[${JSON.stringify(n)}, ${m.toConstructor()}]`)
                .join(",\n") +
            `]))`
        )
    }
}

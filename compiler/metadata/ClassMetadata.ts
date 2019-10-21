
import { SymbolMetadata } from "./SymbolMetadata"

export class ClassMetadata {
    constructor(
        public members: Map<string, SymbolMetadata> = new Map<
            string,
            SymbolMetadata
        >(),
    ) {}

    public setMember(name: string, s: SymbolMetadata) {
        this.members.set(name, s)
    }

    public getMember(name: string) {
        return this.members.get(name)
    }

    public getMembers() {
        return this.members.keys()
    }

    public toConstructor() {
        return (
            `new ClassMetadata(new Map<string, SymbolMetadata>([` +
            Array.from(this.members.entries())
                .map(([n, m]) => `[${JSON.stringify(n)}, ${m.toConstructor()}]`)
                .join(",\n") +
            `]))`
        )
    }
}

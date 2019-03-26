import { ClassMetadata } from "./ClassMetadata"
import { SymbolMetadata } from "./SymbolMetadata"

export class FileMetadata {
    constructor(
        public classes: Map<string, ClassMetadata> = new Map<
            string,
            ClassMetadata
        >(),
        public functions: Map<string, SymbolMetadata> = new Map<
            string,
            SymbolMetadata
        >(),
    ) {}

    public setClass(name: string, c: ClassMetadata) {
        this.classes.set(name, c)
    }

    public getClass(name: string) {
        return this.classes.get(name)
    }

    public getClasses() {
        return Array.from(this.classes.keys())
    }

    public setFunction(name: string, f: SymbolMetadata) {
        this.functions.set(name, f)
    }

    public getFunction(name: string) {
        return this.functions.get(name)
    }

    public getFunctions() {
        return Array.from(this.functions.entries())
    }

    public getFunctionNames() {
        return Array.from(this.functions.keys())
    }

    public toConstructor() {
        return (
            `new FileMetadata(new Map<string, ClassMetadata>([` +
            Array.from(this.classes.entries())
                .map(([n, c]) => `[${JSON.stringify(n)}, ${c.toConstructor()}]`)
                .join(",\n") +
            `]), new Map<string, SymbolMetadata>([` +
            Array.from(this.functions.entries())
                .map(([n, f]) => `[${JSON.stringify(n)}, ${f.toConstructor()}]`)
                .join(",\n") +
            `]))`
        )
    }
}

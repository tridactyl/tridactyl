import { SymbolMetadata } from "./SymbolMetadata"
import { ClassMetadata } from "./ClassMetadata"

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

    setClass(name: string, c: ClassMetadata) {
        this.classes.set(name, c)
    }

    getClass(name: string) {
        return this.classes.get(name)
    }

    getClasses() {
        return Array.from(this.classes.keys())
    }

    setFunction(name: string, f: SymbolMetadata) {
        this.functions.set(name, f)
    }

    getFunction(name: string) {
        return this.functions.get(name)
    }

    getFunctions() {
        return Array.from(this.functions.keys())
    }

    toConstructor() {
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

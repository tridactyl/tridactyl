import { FileMetadata } from "./FileMetadata"

export class ProgramMetadata {
    constructor(
        public files: Map<string, FileMetadata> = new Map<
            string,
            FileMetadata
        >(),
    ) {}

    public setFile(name: string, file: FileMetadata) {
        this.files.set(name, file)
    }

    public getFile(name: string) {
        return this.files.get(name)
    }

    public toConstructor() {
        return (
            `new ProgramMetadata(new Map<string, FileMetadata>([` +
            Array.from(this.files.entries())
                .map(([n, f]) => `[${JSON.stringify(n)}, ${f.toConstructor()}]`)
                .join(",\n") +
            `]))`
        )
    }
}

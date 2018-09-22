import { Type } from "../types/AllTypes"

export class SymbolMetadata {
    constructor(public doc: string, public type: Type) {}

    toConstructor() {
        return `new SymbolMetadata(${JSON.stringify(
            this.doc,
        )}, ${this.type.toConstructor()})`
    }
}

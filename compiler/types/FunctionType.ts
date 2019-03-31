import { Type } from "./Type"

export class FunctionType implements Type {
    public kind = "function"

    constructor(public args: Type[], public ret: Type) {}

    public toConstructor() {
        return (
            `new FunctionType([` +
            // Convert every argument type to its string constructor representation
            this.args.map(cur => cur.toConstructor()) +
            `], ${this.ret.toConstructor()})`
        )
    }

    public toString() {
        return `(${this.args.map(a => a.toString()).join(", ")}) => ${this.ret.toString()}`
    }

    public convert(argument) {
        // Possible strategies:
        // - eval()
        // - window[argument]
        // - tri.excmds[argument]
        throw new Error(`Conversion to function not implemented: ${argument}`)
    }
}

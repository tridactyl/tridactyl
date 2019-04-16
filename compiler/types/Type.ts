
export interface Type {
    kind: string
    name?: string
    toConstructor(): string
    toString(): string
    convert(argument: string): any
}

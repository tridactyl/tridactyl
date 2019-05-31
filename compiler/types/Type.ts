
export interface Type {
    // Only available on argument types
    name?: string
    isDotDotDot?: boolean
    isQuestion?: boolean
    // available everywhere
    kind: string
    toConstructor(): string
    toString(): string
    convert(argument: string): any
}

export interface Token {
    readonly pattern: RegExp
    readonly type: string
    readonly processor?: (lexeme: string) => any
}

export interface Lexeme {
    readonly type: string
    readonly pos: number
    readonly raw_in: string
    readonly processed: any
}

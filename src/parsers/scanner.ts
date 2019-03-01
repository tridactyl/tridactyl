export interface Token {
    readonly pattern: RegExp
    readonly type: string
    processor?: (lexeme: string) => any
}

export interface Lexeme {
    readonly type: string
    readonly pos: number
    readonly raw_in: string
    readonly processed: string | number | boolean
}

interface TokNN {
    readonly pattern: RegExp
    readonly type: string
    readonly processor: (lexeme: string) => any
}

function scan(grammar: TokNN[], remaining: string, curpos: number): Lexeme[] {
    // Ignore whitespace at token boundaries
    const trimmed = remaining.trimLeft()
    const position = curpos + trimmed.length

    // Base case: all input have been consumed
    if (!trimmed) {
        return []
    }

    for (const tok of grammar) {
        const match = tok.pattern.exec(trimmed)
        if (match !== null) {
            // Match found
            const consumed = match[0]
            const lexeme: Lexeme = {
                type: tok.type,
                pos: position,
                raw_in: consumed,
                processed: tok.processor(consumed),
            }

            // Calculate next state
            const nextRemaining = trimmed.substring(consumed.length)
            const nextPos = position + consumed.length

            return prepend(scan(grammar, nextRemaining, nextPos), lexeme)
        }
    }

    // None of the patterns match: invalid input
    throw Error(`Unexpected token at position ${position}`)
}

function identity<T>(x: T): T {
    return x
}

function prepend<T>(arr: T[], elem: T): T[] {
    arr.unshift(elem)
    return arr
}

/**
 * Makes a lexical analyser based on the given lexical grammar. All regular
 * expressions in the grammar must be anchored at start of line (i.e. begin
 * with '^'). (To make my life easier when implementid the analyser)
 *
 * @param grammar The lexical grammar, sorted by priority
 * @return A function that turns a string into an array of lexemes
 */
export function makeLexer(grammar: Token[]): (input: string) => Lexeme[] {
    // Make default processor to be the identity function
    for (const rule of grammar) {
        if (rule.processor === undefined) {
            rule.processor = identity
        }
    }

    return function(input: string) {
        // Trailing whitespace is ignored
        const trimmed = input.trimRight()
        const lexemes = scan(grammar as TokNN[], trimmed, 1)
        return lexemes
    }
}

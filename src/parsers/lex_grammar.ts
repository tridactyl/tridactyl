import { Token, makeLexer } from "@src/parsers/scanner"

// Define a basic lexical grammar

const lexicalGrammar: Token[] = [
    // Put multi before single to match it first
    { type: "shortArgMulti", pattern: /^-[a-zA-Z]+/ },
    { type: "shortArgSingle", pattern: /^-[a-zA-Z]/ },
    // The regex matches as many non escaped quotes as possible until
    // the next quote
    {
        type: "stringLit",
        pattern: /^"(?:\\"|[^"])*?"/,
        // Offload string literal parsing to JSON parser
        processor: JSON.parse,
    },
    {
        type: "numLit",
        pattern: /^\d+(?:\.\d+)?/,
        processor: Number.parseFloat,
    },
    { type: "argument", pattern: /^\S+/ },
]

export const exmodeScanner = makeLexer(lexicalGrammar)

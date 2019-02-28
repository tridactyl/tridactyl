import { Token, makeLexer } from "@src/parsers/scanner"

// Define a basic lexical grammar

const lexicalGrammar: Token[] = [
    { type: "cmdname", pattern: /^\S+/ },
    // Put multi before single to match it first
    { type: "shortArgMulti", pattern: /^-[a-zA-Z]+/ },
    { type: "shortArgSingle", pattern: /^-[a-zA-Z]/ },
    // The regex matches as many non escaped quotes as possible until
    // the next quote
    { type: "stringLit", pattern: /^"(?:\\"|[^"])*?"/ },
    {
        type: "numLit",
        pattern: /^\d+(?:\.\d+)?/,
        processor: Number.parseInt,
    },
]

export const exmodeScanner = makeLexer(lexicalGrammar)

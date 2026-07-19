import { ExProgram } from "@src/lib/excmd"

const operators = [".|", "&&", "||", "|", ";"] as const

export type ExOperator = (typeof operators)[number] | "\n"

interface Span {
    start: number
    end: number
}

export interface ExStructure {
    parts: ExPart[]
    status: "complete" | "incomplete" | "invalid"
}

export type ExPart =
    | ({ type: "text" } & Span)
    | ({ type: "operator"; operator: ExOperator } & Span)
    | ({ type: "comment" } & Span)
    | ({ type: "block"; body: ExStructure } & Span)

interface ParseResult extends ExStructure {
    end: number
}

const boundaries = " \t\r\n"

const status = (
    invalid: boolean,
    incomplete: boolean,
): ExStructure["status"] =>
    invalid ? "invalid" : incomplete ? "incomplete" : "complete"
const isBoundary = (character: string | undefined) =>
    character === undefined || boundaries.includes(character)

function operatorAt(source: string, index: number) {
    if (!isBoundary(source[index - 1])) return undefined
    return operators.find(
        operator =>
            source.startsWith(operator, index) &&
            isBoundary(source[index + operator.length]),
    )
}

function isSpecial(source: string, index: number) {
    return (
        "'\"\\{}#".includes(source[index]) ||
        operators.some(operator => source.startsWith(operator, index))
    )
}

function isStandaloneBrace(source: string, index: number) {
    const boundary = (character: string | undefined) =>
        isBoundary(character) || character === "{" || character === "}"
    return boundary(source[index - 1]) && boundary(source[index + 1])
}

function isWholeLineComment(source: string, index: number) {
    let previous = index - 1
    while (previous >= 0 && " \t\r".includes(source[previous])) previous--
    return previous < 0 || source[previous] === "\n"
}

function parseRange(
    source: string,
    start: number,
    nested: boolean,
): ParseResult {
    const parts: ExPart[] = []
    let textStart = start
    let quote: "'" | '"' | undefined
    let incomplete = false
    let invalid = false
    let expectation: "empty" | "command" | "operand" = "empty"

    const text = (end: number) => {
        if (textStart === end) return
        parts.push({ type: "text", start: textStart, end })
        if (source.slice(textStart, end).trim()) expectation = "command"
    }

    for (let index = start; index < source.length; index++) {
        const character = source[index]

        if (character === "\\" && isSpecial(source, index + 1)) {
            index++
            continue
        }
        if (quote) {
            if (character === quote) quote = undefined
            continue
        }
        if (character === "'" || character === '"') {
            quote = character
            continue
        }
        if (character === "#" && isWholeLineComment(source, index)) {
            text(index)
            const newline = source.indexOf("\n", index)
            const end = newline < 0 ? source.length : newline
            parts.push({ type: "comment", start: index, end })
            index = end - 1
            textStart = end
            continue
        }
        if (character === "\n") {
            text(index)
            parts.push({
                type: "operator",
                operator: "\n",
                start: index,
                end: index + 1,
            })
            if (expectation === "operand") invalid = true
            expectation = "empty"
            textStart = index + 1
            continue
        }
        if (character === "{" && isStandaloneBrace(source, index)) {
            text(index)
            const child = parseRange(source, index + 1, true)
            const end = child.end
            parts.push({
                type: "block",
                start: index,
                end,
                body: { parts: child.parts, status: child.status },
            })
            incomplete = incomplete || child.status === "incomplete"
            invalid = invalid || child.status === "invalid"
            expectation = "command"
            index = end - 1
            textStart = end
            continue
        }
        if (nested && character === "}" && isStandaloneBrace(source, index)) {
            text(index)
            return {
                parts,
                status: status(
                    invalid || expectation === "operand",
                    incomplete,
                ),
                end: index + 1,
            }
        }
        if (!nested && character === "}" && isStandaloneBrace(source, index)) {
            invalid = true
            continue
        }

        const operator = operatorAt(source, index)
        if (!operator) continue
        text(index)
        parts.push({
            type: "operator",
            operator,
            start: index,
            end: index + operator.length,
        })
        if (expectation !== "command") invalid = true
        expectation = "operand"
        index += operator.length - 1
        textStart = index + 1
    }

    text(source.length)
    return {
        parts,
        status: status(
            invalid,
            Boolean(quote || nested || incomplete || expectation === "operand"),
        ),
        end: source.length,
    }
}

export function parseStructure(source: string): ExStructure {
    const result = parseRange(source, 0, false)
    return { parts: result.parts, status: result.status }
}

export type ExCommandRunner = (
    source: string,
    piped: boolean,
    value?: any,
    program?: ExProgram,
) => any

interface ExStage {
    piped: boolean
    command: string
    program?: ExProgram
    block?: ExStage[]
}

function compile(
    source: string,
    structure: ExStructure,
    initialPiped = false,
): ExStage[] {
    const stages: ExStage[] = []
    let sourceText = ""
    let piped = false
    let block: Extract<ExPart, { type: "block" }> | undefined
    let blockCommand = ""

    const flush = () => {
        if (block) {
            if (sourceText.trim())
                throw new Error("Unsupported text after ex block")
            const receivesInput = piped || (stages.length === 0 && initialPiped)
            const body = compile(source, block.body, receivesInput)
            if (blockCommand) {
                if (receivesInput)
                    throw new Error(
                        "Unsupported pipeline input with an ex block argument",
                    )
                stages.push({
                    command: blockCommand,
                    piped,
                    program: {
                        source: source.slice(block.start + 1, block.end - 1),
                        exversion: 2,
                    },
                })
            } else {
                stages.push({ block: body, command: "", piped })
            }
        } else if (sourceText.trim()) {
            stages.push({ command: sourceText.trim(), piped })
        }
        sourceText = ""
        block = undefined
        blockCommand = ""
    }

    for (const part of structure.parts) {
        if (part.type === "text") {
            sourceText += source.slice(part.start, part.end)
            continue
        }
        if (part.type === "comment") continue
        if (part.type === "block") {
            if (block) throw new Error("Unsupported multiple ex blocks")
            block = part
            blockCommand = sourceText.trim()
            sourceText = ""
            continue
        }
        if (!["|", ";", "\n"].includes(part.operator))
            throw new Error(
                `Unsupported ex syntax: ${source.slice(part.start, part.end)}`,
            )
        flush()
        piped = part.operator === "|"
    }
    flush()
    return stages
}

async function execute(
    stages: ExStage[],
    run: ExCommandRunner,
    initialPiped = false,
    initialValue?: any,
) {
    let value = initialValue
    for (let index = 0; index < stages.length; index++) {
        const stage = stages[index]
        const piped = stage.piped || (index === 0 && initialPiped)
        const input = piped ? value : undefined
        try {
            value =
                stage.block !== undefined
                    ? await execute(stage.block, run, piped, input)
                    : await run(stage.command, piped, input, stage.program)
        } catch (error) {
            while (stages[index + 1]?.piped) index++
            if (index === stages.length - 1) throw error
        }
    }
    return value
}

export async function evaluate(
    source: string,
    run: ExCommandRunner,
): Promise<any> {
    const structure = parseStructure(source)
    if (structure.status !== "complete")
        throw new Error(`${structure.status} ex command`)

    return execute(compile(source, structure), run)
}

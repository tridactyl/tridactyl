import { ExProgram, isExCancelled, stripLeadingColons } from "@src/lib/excmd"

const operators = [".|", "|", ";"] as const

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
    | ({ type: "escape" } & Span)
    | ({ type: "operator"; operator: ExOperator } & Span)
    | ({ type: "comment" } & Span)
    | ({ type: "heredoc"; bodyStart: number; bodyEnd: number } & Span)
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

function escapedSyntaxEnd(source: string, index: number) {
    if (source[index] !== "\\") return undefined
    const operator = operators.find(
        candidate =>
            source.startsWith(candidate, index + 1) &&
            isBoundary(source[index - 1]) &&
            isBoundary(source[index + candidate.length + 1]),
    )
    if (operator) return index + operator.length + 1
    const escaped = source[index + 1]
    if (
        (escaped === "{" || escaped === "}") &&
        isBraceBoundary(source, index - 1) &&
        isBraceBoundary(source, index + 2)
    )
        return index + 2
    if (
        (escaped === "#" || escaped === '"') &&
        isWholeLineComment(source, index)
    )
        return index + 2
    return undefined
}

function isBraceBoundary(source: string, index: number) {
    const character = source[index]
    return (
        isBoundary(character) ||
        "{}".includes(character) ||
        (character === "\\" && "{}".includes(source[index + 1]))
    )
}

function isStandaloneBrace(source: string, index: number) {
    return (
        isBraceBoundary(source, index - 1) && isBraceBoundary(source, index + 1)
    )
}

function isWholeLineComment(source: string, index: number) {
    let previous = index - 1
    while (previous >= 0 && " \t\r".includes(source[previous])) previous--
    return previous < 0 || source[previous] === "\n"
}

function heredocAt(source: string, index: number) {
    if (!isBoundary(source[index - 1])) return undefined
    const rest = source.slice(index)
    const inline =
        /^<<([A-Za-z_][A-Za-z0-9_]*)[ \t](.*)[ \t]\1[ \t]*\r?(?=\n|$)/.exec(
            rest,
        )
    if (inline) {
        const bodyStart = index + inline[1].length + 3
        return {
            start: index,
            end: index + inline[0].length,
            bodyStart,
            bodyEnd: bodyStart + inline[2].length,
        }
    }

    const opener = /^<<([A-Za-z_][A-Za-z0-9_]*)[ \t]*\r?(?:\n|$)/.exec(rest)
    if (!opener) {
        if (!/^<<[A-Za-z_][A-Za-z0-9_]*(?=[ \t\r\n]|$)/.test(rest))
            return undefined
        if (/[\r\n]/.test(rest))
            return {
                start: index,
                end: source.length,
                bodyStart: source.length,
                bodyEnd: source.length,
                invalid: true,
            }
        return { start: index, end: source.length, bodyStart: source.length }
    }
    const bodyStart = index + opener[0].length
    if (!opener[0].endsWith("\n"))
        return { start: index, end: source.length, bodyStart: source.length }

    const terminator = new RegExp(`^${opener[1]}\\r?(?=\\n|$)`, "m").exec(
        source.slice(bodyStart),
    )
    if (!terminator) return { start: index, end: source.length, bodyStart }
    const bodyEnd = bodyStart + terminator.index
    return {
        start: index,
        end: bodyEnd + terminator[0].length,
        bodyStart,
        bodyEnd,
    }
}

function parseRange(
    source: string,
    start: number,
    nested: boolean,
): ParseResult {
    const parts: ExPart[] = []
    let textStart = start
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

        const escapedEnd = escapedSyntaxEnd(source, index)
        if (escapedEnd !== undefined) {
            text(index)
            parts.push({ type: "escape", start: index, end: escapedEnd })
            expectation = "command"
            index = escapedEnd - 1
            textStart = escapedEnd
            continue
        }
        if (
            (character === "#" || character === '"') &&
            isWholeLineComment(source, index)
        ) {
            text(index)
            const newline = source.indexOf("\n", index)
            const end = newline < 0 ? source.length : newline
            parts.push({ type: "comment", start: index, end })
            index = end - 1
            textStart = end
            continue
        }
        const heredoc = character === "<" && heredocAt(source, index)
        if (heredoc) {
            text(index)
            parts.push({ type: "heredoc", bodyEnd: source.length, ...heredoc })
            if (expectation !== "command") invalid = true
            if ("invalid" in heredoc) invalid = true
            if (heredoc.bodyEnd === undefined) incomplete = true
            index = heredoc.end - 1
            textStart = heredoc.end
            continue
        }
        if (character === "\n") {
            text(index)
            if (expectation === "operand") {
                textStart = index + 1
                continue
            }
            parts.push({
                type: "operator",
                operator: "\n",
                start: index,
                end: index + 1,
            })
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
            Boolean(nested || incomplete || expectation === "operand"),
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
    raw?: string,
) => any

interface ExStage {
    piped: boolean
    command: string
    map?: ExStage[]
    program?: ExProgram
    raw?: string
    block?: ExStage[]
}

const mapStage = (map: ExStage[], piped = false): ExStage => ({
    command: "",
    piped,
    map,
})

function mapError(index: number, cause: unknown) {
    return Object.assign(
        new Error(
            `map item ${index}: ${
                cause instanceof Error ? cause.message : String(cause)
            }`,
        ),
        { cause },
    )
}

function compile(
    source: string,
    structure: ExStructure,
    initialPiped = false,
): ExStage[] {
    const stages: ExStage[] = []
    let sourceText = ""
    let piped = false
    let mapNext = false
    let block: Extract<ExPart, { type: "block" }> | undefined
    let blockCommand = ""
    let raw: string | undefined

    const push = (stage: ExStage) => {
        stages.push(mapNext ? mapStage([stage], true) : stage)
        mapNext = false
    }

    const flush = () => {
        if (block && raw !== undefined)
            throw new Error("Unsupported ex block with a heredoc")
        if (block) {
            if (sourceText.trim())
                throw new Error("Unsupported text after ex block")
            const receivesInput =
                piped || mapNext || (stages.length === 0 && initialPiped)
            const body = compile(source, block.body, receivesInput)
            if (blockCommand) {
                if (receivesInput)
                    throw new Error(
                        "Unsupported pipeline input with an ex block argument",
                    )
                push({
                    command: blockCommand,
                    piped,
                    program: {
                        source: source.slice(block.start + 1, block.end - 1),
                        exversion: 2,
                    },
                })
            } else {
                push({ block: body, command: "", piped })
            }
        } else {
            const command = stripLeadingColons(sourceText.trim()).trimStart()
            if (command) push({ command, piped, raw })
        }
        sourceText = ""
        block = undefined
        blockCommand = ""
        raw = undefined
    }

    for (const part of structure.parts) {
        if (part.type === "text") {
            sourceText += source.slice(part.start, part.end)
            continue
        }
        if (part.type === "escape") {
            sourceText += source.slice(part.start + 1, part.end)
            continue
        }
        if (part.type === "comment") continue
        if (part.type === "heredoc") {
            raw = source.slice(part.bodyStart, part.bodyEnd)
            continue
        }
        if (part.type === "block") {
            if (block) throw new Error("Unsupported multiple ex blocks")
            block = part
            blockCommand = stripLeadingColons(sourceText.trim()).trimStart()
            sourceText = ""
            continue
        }
        if (!["|", ".|", ";", "\n"].includes(part.operator))
            throw new Error(
                `Unsupported ex syntax: ${source.slice(part.start, part.end)}`,
            )
        flush()
        mapNext = part.operator === ".|"
        piped = part.operator === "|"
    }
    flush()
    return stages
}

async function mapValues(stages: ExStage[], run: ExCommandRunner, input: any) {
    if (!Array.isArray(input)) throw new Error("map expected an array")
    const values = await Promise.all(
        input.map((item, index) =>
            execute(stages, run, true, item).catch(error => {
                throw mapError(index, error)
            }),
        ),
    )
    return values.find(isExCancelled) ?? values
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
            if (stage.map && !piped)
                throw new Error("map requires pipeline input")
            value = stage.map
                ? await mapValues(stage.map, run, input)
                : stage.block !== undefined
                  ? await execute(stage.block, run, piped, input)
                  : stage.raw === undefined
                    ? await run(stage.command, piped, input, stage.program)
                    : await run(
                          stage.command,
                          piped,
                          input,
                          stage.program,
                          stage.raw,
                      )
        } catch (error) {
            while (stages[index + 1]?.piped) index++
            if (index === stages.length - 1) throw error
        }
        if (isExCancelled(value)) return value
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

import { evaluate, ExStructure, parseStructure } from "@src/parsers/exdsl"
import { formatExProgram } from "@src/lib/excmd"

function shape(source: string, structure = parseStructure(source)): any[] {
    return structure.parts.map(part => [
        part.type,
        source.slice(part.start, part.end),
        part.type === "block" ? shape(source, part.body) : undefined,
    ])
}

function heredoc(source: string) {
    const part = parseStructure(source).parts.find(
        part => part.type === "heredoc",
    )
    if (!part || part.type !== "heredoc") throw new Error("Missing heredoc")
    return part
}

test("finds standalone composition operators losslessly", () => {
    const source = "a .| b && c || d ; e"
    expect(shape(source)).toEqual([
        ["text", "a ", undefined],
        ["operator", ".|", undefined],
        ["text", " b ", undefined],
        ["operator", "&&", undefined],
        ["text", " c ", undefined],
        ["operator", "||", undefined],
        ["text", " d ", undefined],
        ["operator", ";", undefined],
        ["text", " e", undefined],
    ])
})

test.each([
    "echo a|b",
    "echo a| b",
    "echo a |b",
    "echo C:\\windows\\etc",
    "echo /a\\|b/",
    "echo {| b",
])("does not split protected or non-standalone operators in %s", source => {
    expect(shape(source)).toEqual([["text", source, undefined]])
    expect(parseStructure(source).status).toBe("complete")
})

test("only backslash protects and is removed from standalone DSL syntax", async () => {
    const run = jest.fn()
    await evaluate("echo \\| \\&& \\|| \\.| \\; \\{ \\} \\{\\}", run)
    expect(run).toHaveBeenCalledWith(
        "echo | && || .| ; { } {}",
        false,
        undefined,
        undefined,
    )
})

test("quotes are ordinary source", () => {
    const source = `echo "a | b"`
    expect(shape(source)).toEqual([
        ["text", 'echo "a ', undefined],
        ["operator", "|", undefined],
        ["text", ' b"', undefined],
    ])
    expect(parseStructure("echo 'unfinished").status).toBe("complete")
    expect(parseStructure('echo "unfinished').status).toBe("complete")
})

test("backslash protects whole-line comment markers", async () => {
    const run = jest.fn()
    await evaluate('\\# literal\n\\" literal', run)
    expect(run.mock.calls).toEqual([
        ["# literal", false, undefined, undefined],
        ['" literal', false, undefined, undefined],
    ])
})

test("protects operators in whole-line comments and separates lines", () => {
    const source = 'echo one\n" legacy comment ; .|\n# ignore | &&\necho two'
    expect(shape(source)).toEqual([
        ["text", "echo one", undefined],
        ["operator", "\n", undefined],
        ["comment", '" legacy comment ; .|', undefined],
        ["operator", "\n", undefined],
        ["comment", "# ignore | &&", undefined],
        ["operator", "\n", undefined],
        ["text", "echo two", undefined],
    ])
})

test("parses nested blocks independently", () => {
    const source = "bind x { hint | tabopen } ; echo done"
    expect(shape(source)).toEqual([
        ["text", "bind x ", undefined],
        [
            "block",
            "{ hint | tabopen }",
            [
                ["text", " hint ", undefined],
                ["operator", "|", undefined],
                ["text", " tabopen ", undefined],
            ],
        ],
        ["text", " ", undefined],
        ["operator", ";", undefined],
        ["text", " echo done", undefined],
    ])
})

test("reports an unterminated block as incomplete", () =>
    expect(parseStructure("bind x { echo done").status).toBe("incomplete"))

test.each(["echo a |", "echo a &&", "echo a .|", "echo a ;"])(
    "reports a missing right operand in %s",
    source => expect(parseStructure(source).status).toBe("incomplete"),
)

test.each([
    "| echo a",
    "echo a | | echo b",
    "echo a ; ; echo b",
    "echo a }",
    "{ echo a | }",
    "js <<JS console.log(1)\necho done",
    "js <<JS console.log(1)\rmore JS",
    "js <<JS console.log(1)\r",
])("reports invalid input for %s", source =>
    expect(parseStructure(source).status).toBe("invalid"),
)

test("evaluates pipes and sequences in order", async () => {
    const calls: any[] = []
    const result = await evaluate("a | b ; c | d", (source, piped, value) => {
        calls.push([source, piped, value])
        return piped ? `${source}(${value})` : source
    })
    expect(calls).toEqual([
        ["a", false, undefined],
        ["b", true, "a"],
        ["c", false, undefined],
        ["d", true, "c"],
    ])
    expect(result).toBe("d(c)")
})

test("continues incomplete operators across newlines", async () => {
    const run = jest.fn((source, piped, value) =>
        piped ? `${source}(${value})` : source,
    )
    await expect(evaluate("a |\n# comment\n b", run)).resolves.toBe("b(a)")
    expect(run.mock.calls).toEqual([
        ["a", false, undefined, undefined],
        ["b", true, "a", undefined],
    ])
})

test.each(["a && b", "a .| b"])(
    "rejects unsupported execution syntax in %s",
    source =>
        expect(evaluate(source, jest.fn())).rejects.toThrow("Unsupported"),
)

test("rejects unsupported syntax before execution", async () => {
    const run = jest.fn()
    await expect(evaluate("a ; b && c", run)).rejects.toThrow("Unsupported")
    expect(run).not.toHaveBeenCalled()
})

test("continues sequences after a rejected pipeline", async () => {
    const run = jest.fn(source => {
        if (source === "a") throw new Error("failed")
        return source
    })
    await expect(evaluate("a | b ; c", run)).resolves.toBe("c")
    expect(run.mock.calls.map(call => call[0])).toEqual(["a", "c"])
})

test("ignores comments and treats newlines as sequences", async () => {
    const run = jest.fn(source => source)
    await expect(
        evaluate("# ignored | operator\na\n\n  # also ignored\nb\n", run),
    ).resolves.toBe("b")
    expect(run.mock.calls.map(call => call[0])).toEqual(["a", "b"])
})

test("evaluates nested standalone blocks with pipeline input", async () => {
    const calls: any[] = []
    const run = jest.fn((source, piped, value) => {
        calls.push([source, piped, value])
        return piped ? `${source}(${value})` : source
    })
    await expect(evaluate("a | { b | { c } }", run)).resolves.toBe("c(b(a))")
    expect(calls).toEqual([
        ["a", false, undefined],
        ["b", true, "a"],
        ["c", true, "b(a)"],
    ])
})

test("passes a trailing block as a versioned program argument", async () => {
    const run = jest.fn()
    await evaluate("bind x { a\n# keep this comment\nb }", run)
    expect(run).toHaveBeenCalledWith("bind x", false, undefined, {
        source: " a\n# keep this comment\nb ",
        exversion: 2,
    })
})

test("passes a heredoc body as one lossless trailing argument", async () => {
    const source = "js <<JS  \nconst value = a && b\nwindow.alert(value)\nJS"
    const run = jest.fn()
    await evaluate(source, run)
    expect(run).toHaveBeenCalledWith(
        "js",
        false,
        undefined,
        undefined,
        "const value = a && b\nwindow.alert(value)\n",
    )
    await evaluate("js <<EMPTY\nEMPTY", run)
    expect(run.mock.calls[1][4]).toBe("")
})

test("passes an inline heredoc body as raw source", async () => {
    const run = jest.fn()
    await evaluate("js <<JS console.log(0 || 1) JS\necho done", run)
    expect(run.mock.calls[0][4]).toBe("console.log(0 || 1)")
    expect(run.mock.calls[1][0]).toBe("echo done")
    await evaluate("js <<JS  padded  JS  ", run)
    expect(run.mock.calls[2][4]).toBe(" padded ")
    await evaluate("js <<JS  JS", run)
    expect(run.mock.calls[3][4]).toBe("")
    await evaluate("js <<JS value JS\r", run)
    expect(run.mock.calls[4][4]).toBe("value")
})

test.each([
    "js <<JS",
    "js <<JS\r",
    "js <<JS JS",
    "js <<JS console.log(1)",
    "js <<JS\nconst value = true",
])("reports an unterminated heredoc as incomplete", source =>
    expect(parseStructure(source).status).toBe("incomplete"),
)

test("keeps inline heredoc spans ordered", () => {
    for (const source of ["js <<JS  JS", "js <<JS value\necho done"]) {
        const { start, bodyStart, bodyEnd, end } = heredoc(source)
        expect(
            start <= bodyStart && bodyStart <= bodyEnd && bodyEnd <= end,
        ).toBe(true)
    }
})

test("requires an exact heredoc terminator and resumes after it", async () => {
    const run = jest.fn()
    await evaluate("echo <<END\r\nfirst\r\nEND suffix\r\nEND\r\necho done", run)
    expect(run.mock.calls).toEqual([
        ["echo", false, undefined, undefined, "first\r\nEND suffix\r\n"],
        ["echo done", false, undefined, undefined],
    ])
})

test("formats blocks containing whole-line comments safely", async () => {
    const source = formatExProgram({
        source: "# first\na\n# last",
        exversion: 2,
    })
    const run = jest.fn()
    await evaluate(`bind x ${source}`, run)
    expect(run.mock.calls[0][3]).toEqual({
        source: "\n# first\na\n# last\n",
        exversion: 2,
    })
})

test.each(["a ; { b && c }", "a | { bind x { b } }"])(
    "rejects unsupported nested syntax before executing %s",
    async source => {
        const run = jest.fn()
        await expect(evaluate(source, run)).rejects.toThrow("Unsupported")
        expect(run).not.toHaveBeenCalled()
    },
)

test.each([
    "bind { a } trailing",
    "bind x { a } { b }",
    "a | bind x { b }",
    "bind x { a } <<JS\nb\nJS",
])("rejects ambiguous block arguments in %s", source =>
    expect(evaluate(source, jest.fn())).rejects.toThrow("Unsupported"),
)

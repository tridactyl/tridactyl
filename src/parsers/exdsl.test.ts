import { evaluate, ExStructure, parseStructure } from "@src/parsers/exdsl"

function shape(source: string, structure = parseStructure(source)): any[] {
    return structure.parts.map(part => [
        part.type,
        source.slice(part.start, part.end),
        part.type === "block" ? shape(source, part.body) : undefined,
    ])
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
    'echo "a | b"',
    "echo 'a && b'",
    "echo \\|",
    "echo C:\\windows\\etc",
    "echo {| b",
])("does not split protected or non-standalone operators in %s", source => {
    expect(shape(source)).toEqual([["text", source, undefined]])
    expect(parseStructure(source).status).toBe("complete")
})

test("protects operators in whole-line comments and separates lines", () => {
    const source = "echo one\n# ignore | &&\necho two"
    expect(shape(source)).toEqual([
        ["text", "echo one", undefined],
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

test.each(["echo 'unfinished", 'echo "unfinished', "bind x { echo done"])(
    "reports incomplete input for %s",
    source => expect(parseStructure(source).status).toBe("incomplete"),
)

test.each(["echo a |", "echo a &&", "echo a .|", "echo a ;"])(
    "reports a missing right operand in %s",
    source => expect(parseStructure(source).status).toBe("incomplete"),
)

test.each([
    "| echo a",
    "echo a | | echo b",
    "echo a |\necho b",
    "echo a }",
    "{ echo a | }",
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

test.each(["a && b", "a .| b", "bind x { a | b }"])(
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

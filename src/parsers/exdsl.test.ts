import { evaluate, ExStructure, parseStructure } from "@src/parsers/exdsl"
import { EX_CANCELLED, formatExProgram, isExCancelled } from "@src/lib/excmd"
import { parser as parseExCommand } from "@src/parsers/exmode"
import { acceptExCmd, setExCmds } from "@src/lib/controller"
import * as aliases from "@src/lib/aliases"

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
    const source = "a .| b ; e"
    expect(shape(source)).toEqual([
        ["text", "a ", undefined],
        ["operator", ".|", undefined],
        ["text", " b ", undefined],
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
        "echo | \\&& \\|| .| ; { } {}",
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

test.each(["echo a |", "echo a .|", "echo a ;"])(
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

test("ignores leading colons on every command", async () => {
    const run = jest.fn(source => source)
    await evaluate(":one\n{ :::two } ; :echo :::argument", run)
    expect(run.mock.calls.map(call => call[0])).toEqual([
        "one",
        "two",
        "echo :::argument",
    ])
})

test("leading colons work with map and preserve heredoc bodies", async () => {
    const values = [{ id: 1 }, { id: 2 }]
    const mapRun = jest.fn(source => (source === "values" ? values : source))
    await evaluate("values | :map _.id", mapRun)
    expect(mapRun.mock.calls.map(call => call[0])).toEqual([
        "values",
        "map _.id",
    ])

    const run = jest.fn()
    await evaluate(":js <<JS\n:literal\nJS", run)
    expect(run).toHaveBeenCalledWith(
        "js",
        false,
        undefined,
        undefined,
        ":literal\n",
    )
})

test.each([
    ":::echo https://example.org/a:b :::argument",
    {
        source: ":::echo https://example.org/a:b :::argument",
        exversion: 2 as const,
    },
])("normalizes leading colons before executing %p", async command => {
    const echo = jest.fn((...args) => args)
    setExCmds({ "": { echo, repeat: jest.fn() } })
    await acceptExCmd(command)
    expect(echo).toHaveBeenCalledWith("https://example.org/a:b", ":::argument")
})

test("preserves typed values in ordinary pipes", async () => {
    const value = [{ id: 1 }]
    const run = jest.fn((source, _piped, input) =>
        source === "source" ? value : input,
    )
    await expect(evaluate("source | sink", run)).resolves.toBe(value)
    expect(run.mock.calls[1][2]).toBe(value)
})

test("evaluates pipeline input expressions in command arguments", () => {
    const commands = {
        "": {
            echo: jest.fn(),
            map: jest.fn(),
            repeat: jest.fn(),
            version: jest.fn(),
        },
    }
    const value = { items: [{ name: "one" }, { name: "two words" }] }
    const parse = (source: string, piped = true) =>
        parseExCommand(source, commands, { piped, value }).slice(1)
    expect(parse("echo _.items[1].name =")).toEqual([["two words", "="], true])
    expect(parse("echo =")).toEqual([["="], false])
    expect(parse("echo _ _.items[0].name")).toEqual([[value, "one"], true])
    expect(() => parse("echo _[1]", false)).toThrow(
        "Input expression _[1] used without pipeline input",
    )
    expect(parse("echo \\_[1]")).toEqual([["_[1]"], false])
    expect(parse("echo =.items[0]")).toEqual([["=.items[0]"], false])
})

test("input expressions replace the implicit pipeline argument", () => {
    const sink = jest.fn((...args) => args)
    setExCmds({ "": { source: () => [0, 1, 2], sink, repeat: jest.fn() } })
    return expect(
        acceptExCmd({ source: "source | sink _[2:0]", exversion: 2 }),
    ).resolves.toEqual([[2, 1, 0]])
})

test.each([
    [
        "value | _.items[1][0].name",
        { items: [[{ name: "one" }], [{ name: "two" }]] },
        "two",
    ],
    [
        "value | _.item | _.name",
        { item: Promise.resolve({ name: "one" }) },
        "one",
    ],
])("evaluates bare expression pipeline %s", (source, value, expected) => {
    setExCmds({ "": { value: () => value, repeat: jest.fn() } })
    return expect(acceptExCmd({ source, exversion: 2 })).resolves.toBe(expected)
})

test("groups expression arguments by precedence", () => {
    const commands = { "": { echo: jest.fn(), repeat: jest.fn() } }
    const parse = (source: string) =>
        parseExCommand(source, commands, { piped: true, value: 3 }).slice(1)
    expect(parse("echo _ _")).toEqual([[3, 3], true])
    expect(parse("echo _ > 2")).toEqual([[true], true])
    expect(parse("echo _ > 2 && _ < 4 _")).toEqual([[true, 3], true])
    expect(parse("echo ( _ > 2 )")).toEqual([[true], true])
    expect(parse("echo (true) && _")).toEqual([[true], true])
    expect(parse("echo (hello) _")).toEqual([["(hello)", 3], true])
    expect(parse("echo (hello) > 2")).toEqual([
        ["(hello)", ">", "2"],
        false,
    ])
    expect(parse("echo _ <C-x>")).toEqual([[3, "<C-x>"], true])
    expect(parse("echo x > 2")).toEqual([["x", ">", "2"], false])
    expect(() => parse("echo _ > nope")).toThrow("Invalid expression")
    expect(() => parse("echo _ > 2 > 1")).toThrow("Invalid expression")
})

test("compiles callback expressions in legacy parsing", () => {
    const commands = { "": { map: jest.fn(), repeat: jest.fn() } }
    const [, [callback], consumed] = parseExCommand("map _.x > 1", commands)
    expect(callback({ x: 2 })).toBe(true)
    expect(consumed).toBe(false)
})

test("expands aliases before detecting expression stages", () => {
    const expand = jest
        .spyOn(aliases, "expandExstr")
        .mockImplementation(source => (source === "project" ? "_.url" : source))
    try {
        const [callback, args, consumed] = parseExCommand(
            "project",
            { "": { repeat: jest.fn() } },
            { piped: true, value: { url: "one" } },
        )
        expect(callback(...args)).toBe("one")
        expect(consumed).toBe(true)
    } finally {
        expand.mockRestore()
    }
})

test.each([
    ["values .| double", "double"],
    ["values .| _double", "_double"],
])("maps exactly one command in %s", async (source, target) => {
    const run = jest.fn((command, _piped, input) =>
        command === "values" ? [1, 2, 3] : input * 2,
    )
    await expect(evaluate(source, run)).resolves.toEqual([2, 4, 6])
    expect(run.mock.calls.map(call => call[0])).toEqual([
        "values",
        target,
        target,
        target,
    ])
})

test("maps expression stages without rewriting them as commands", async () => {
    const values = [{ url: "one" }, { url: "two" }]
    const run = jest.fn((command, _piped, input) =>
        command === "values" ? values : input.url,
    )
    await expect(evaluate("values .| _.url", run)).resolves.toEqual([
        "one",
        "two",
    ])
    expect(run.mock.calls.map(call => call[0])).toEqual([
        "values",
        "_.url",
        "_.url",
    ])
})

test("evaluates mapped expressions against each item", () => {
    setExCmds({ "": { source: () => [1, 3], repeat: jest.fn() } })
    return expect(
        acceptExCmd({ source: "source .| _ > 1", exversion: 2 }),
    ).resolves.toEqual([false, true])
})

test("passes expression callbacks according to parameter metadata", async () => {
    const map = jest.fn((callback, values) => values.map(callback))
    const filter = jest.fn((callback, values) => values.filter(callback))
    const sink = jest.fn((...args) => args)
    setExCmds({
        "": {
            source: () => [{ x: 1 }, { x: 3 }],
            map,
            filter,
            sink,
            repeat: jest.fn(),
        },
    })
    await expect(
        acceptExCmd({
            source: "source | filter _.x > 1 | map _.x | sink _",
            exversion: 2,
        }),
    ).resolves.toEqual([[3]])
    expect(filter.mock.calls[0][0]).toEqual(expect.any(Function))
    expect(map.mock.calls[0][0]).toEqual(expect.any(Function))
})

test("maps a command with arguments and pipes the collected results", async () => {
    const run = jest.fn((command, _piped, input) => {
        if (command === "values") return [1, 2]
        if (command === "add 3") return input + 3
        return input.reduce((sum, value) => sum + value, 0)
    })
    await expect(evaluate("values .| add 3 | sum", run)).resolves.toBe(9)
})

test("maps a multi-stage block", () =>
    expect(
        evaluate(
            "values .| { double | stringify }",
            (command, _piped, input) => {
                if (command === "values") return [1, 2]
                if (command === "double") return input * 2
                return String(input)
            },
        ),
    ).resolves.toEqual(["2", "4"]))

test("supports nested block maps", () =>
    expect(
        evaluate("matrix .| { pass .| double }", (command, _piped, input) => {
            if (command === "matrix")
                return [
                    [1, 2],
                    [3, 4],
                ]
            return command === "pass" ? input : input * 2
        }),
    ).resolves.toEqual([
        [2, 4],
        [6, 8],
    ]))

test("runs mapped commands concurrently while preserving result order", async () => {
    let active = 0
    let maximumActive = 0
    const run = jest.fn(async (command, _piped, input) => {
        if (command === "values") return [1, 2, 3]
        maximumActive = Math.max(maximumActive, ++active)
        await new Promise(resolve => setTimeout(resolve, 4 - input))
        active--
        return input * 2
    })
    await expect(evaluate("values .| work", run)).resolves.toEqual([2, 4, 6])
    expect(maximumActive).toBe(3)
})

test("reports the failed map item while already-started items continue", async () => {
    const started: number[] = []
    const error = await evaluate("values .| work", (command, _piped, input) => {
        if (command === "values") return [0, 1, 2]
        started.push(input)
        if (input === 1) throw new Error("boom")
        return input
    }).catch(error => error)
    expect(error).toEqual(
        expect.objectContaining({ message: "map item 1: boom" }),
    )
    expect(error.cause).toEqual(expect.objectContaining({ message: "boom" }))
    expect(started).toEqual([0, 1, 2])
})

test.each(["text", "object"])("rejects %s map input", async command => {
    const value = command === "text" ? "one two" : { one: 1, two: 2 }
    await expect(
        evaluate(`${command} .| echo`, source =>
            source === command ? value : source,
        ),
    ).rejects.toThrow("map expected an array")
})

test("maps an empty array without invoking the target", async () => {
    const run = jest.fn(source => {
        if (source === "values") return []
        throw new Error("target invoked")
    })
    await expect(evaluate("values .| target", run)).resolves.toEqual([])
    expect(run).toHaveBeenCalledTimes(1)
})

test("treats map as an ordinary command", async () => {
    const values = [1, 2]
    const run = jest.fn((command, _piped, input) =>
        command === "values" ? values : input,
    )
    await expect(evaluate("values | map target", run)).resolves.toBe(values)
    expect(run.mock.calls.map(call => call[0])).toEqual([
        "values",
        "map target",
    ])
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

test("treats Boolean expression symbols as command text", async () => {
    const run = jest.fn()
    await evaluate("filter (_.x == 1) || (_.y == 2) && _.ok", run)
    expect(run.mock.calls[0][0]).toBe("filter (_.x == 1) || (_.y == 2) && _.ok")
})

test("continues sequences after a rejected pipeline", async () => {
    const run = jest.fn(source => {
        if (source === "a") throw new Error("failed")
        return source
    })
    await expect(evaluate("a | b ; c", run)).resolves.toBe("c")
    expect(run.mock.calls.map(call => call[0])).toEqual(["a", "c"])
})

test.each(["a | cancel | b ; c", "a | { cancel | b } ; c"])(
    "cancellation stops the whole program in %s",
    async source => {
        const run = jest.fn(command =>
            command === "cancel"
                ? JSON.parse(JSON.stringify(EX_CANCELLED))
                : command,
        )
        const result = await evaluate(source, run)
        expect(isExCancelled(result)).toBe(true)
        expect(run.mock.calls.map(call => call[0])).toEqual(["a", "cancel"])
    },
)

test("cancellation in a map stops its parent program", async () => {
    const run = jest.fn((command, _piped, input) => {
        if (command === "values") return [0, 1, 2]
        if (command === "work") return input === 1 ? EX_CANCELLED : input
        return command
    })
    const result = await evaluate("values .| work | sink ; after", run)
    expect(isExCancelled(result)).toBe(true)
    expect(run.mock.calls.map(call => call[0])).toEqual([
        "values",
        "work",
        "work",
        "work",
    ])
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

test("rejects unsupported nested syntax before executing", async () => {
    const run = jest.fn()
    await expect(evaluate("a | { bind x { b } }", run)).rejects.toThrow(
        "Unsupported",
    )
    expect(run).not.toHaveBeenCalled()
})

test.each([
    "bind { a } trailing",
    "bind x { a } { b }",
    "a | bind x { b }",
    "bind x { a } <<JS\nb\nJS",
])("rejects ambiguous block arguments in %s", source =>
    expect(evaluate(source, jest.fn())).rejects.toThrow("Unsupported"),
)

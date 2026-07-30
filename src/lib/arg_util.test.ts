import {
    analyseForCompletion,
    parse,
    replaceActiveValue,
    replacePositionals,
} from "@src/lib/arg_util"

const spec = {
    "-b": Boolean,
    "-B": "-b",
    "-p": Boolean,
    "-c": String,
    "-n": Number,
    "-2": Boolean,
    "-private": Boolean,
    "-secret": "-private",
    "--name": String,
}

test.each([
    [["-b", "url"], { _: ["url"], "-b": true }],
    [["url", "-c", "work"], { _: ["url"], "-c": "work" }],
    [["url", "-B", "-n", "-2"], { _: ["url"], "-b": true, "-n": -2 }],
    [["--name=value", "url"], { _: ["url"], "--name": "value" }],
    [["-b", "url", "-c", "work"], { _: ["url"], "-b": true, "-c": "work" }],
    [["-bc", "-work", "url"], { _: ["url"], "-b": true, "-c": "-work" }],
    [["url", "-private"], { _: ["url"], "-private": true }],
    [["url", "-secret"], { _: ["url"], "-private": true }],
    [["one", "-b", "two"], { _: ["one", "-b", "two"] }],
    [["one", "-bp", "two"], { _: ["one", "-bp", "two"] }],
    [["one", "-c", "work", "two"], { _: ["one", "-c", "work", "two"] }],
    [["one", "-b", "constructor"], { _: ["one", "-b", "constructor"] }],
    [["-x", "-b", "url"], { _: ["-x", "-b", "url"] }],
    [["-b", "url", "-bx"], { _: ["url", "-bx"], "-b": true }],
    [["url", "-bp"], { _: ["url"], "-b": true, "-p": true }],
    [
        ["-b", "url", "-c", "work", "--", "-p"],
        { _: ["url", "-p"], "-b": true, "-c": "work" },
    ],
])("parses only options at argument edges", (argv, expected) => {
    expect(parse(spec, { argv })).toEqual(expected)
})

test("rejects a missing edge option value", () => {
    expect(() => parse(spec, { argv: ["url", "-c"] })).toThrow()
})

test("supports custom missing-value errors", () => {
    expect(() =>
        parse(spec, {
            argv: ["url", "-c"],
            missingValueErrors: { "-c": "A container name is required" },
        }),
    ).toThrow("A container name is required")
})

test.each([
    ["-bp url", [["-bp"], ["url"], []]],
    ["url -bp", [[], ["url"], ["-bp"]]],
    ["url -bp ", [[], ["url"], ["-bp"]]],
    ["-b url -c work", [["-b"], ["url"], ["-c", "work"]]],
    ["one -b two", [[], ["one", "-b", "two"], []]],
    ["-- url -c work", [[], ["url", "-c", "work"], []]],
])("analyses completion edges in %s", (args, expected) => {
    const analysis = analyseForCompletion(spec, args)
    expect([analysis.leading, analysis.positionals, analysis.trailing]).toEqual(
        expected,
    )
})

test.each([
    ["url -c", "-c", ""],
    ["url -c ", "-c", ""],
    ["-c wo", "-c", "wo"],
    ["url -c wo", "-c", "wo"],
    ["url -bc wo", "-c", "wo"],
    ["url -c -work", "-c", "-work"],
])("finds the active option value in %s", (args, option, query) => {
    const analysis = analyseForCompletion(spec, args)
    expect(analysis.activeValue).toMatchObject({ option, query })
})

test("reconstructs completed positional and option values", () => {
    const analysis = analyseForCompletion(spec, "-bp exa -c wo")
    expect(replacePositionals(analysis, ["https://example.com"])).toEqual([
        "-bp",
        "https://example.com",
        "-c",
        "wo",
    ])
    expect(replaceActiveValue(analysis, "work")).toEqual([
        "-bp",
        "exa",
        "-c",
        "work",
    ])
})

test("does not consume recognised options as completion values", () => {
    expect(analyseForCompletion(spec, "url -c -bp").activeValue).toBeUndefined()
})

test("preserves explicit option termination when reconstructing", () => {
    const analysis = analyseForCompletion(spec, "-- -b query")
    expect(replacePositionals(analysis, ["https://example.com"])).toEqual([
        "--",
        "https://example.com",
    ])
})

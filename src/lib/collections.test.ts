import { expression, filter, map, selector } from "@src/lib/collections"

test.each([
    ["_", { url: "one" }, { url: "one" }],
    ["_.url", { url: "one" }, "one"],
    ["_.author.name", { author: { name: "Olie" } }, "Olie"],
])("applies magic selector %s", (source, value, expected) =>
    expect(selector(source)(value)).toEqual(expected),
)

test("maps and filters arrays with magic selectors", () => {
    const values = [{ url: "one" }, {}, { url: "two" }]
    expect(map("_.url", filter("_.url", values))).toEqual(["one", "two"])
})

test.each([
    ["_.x == 'ok'", { x: "ok" }, true],
    ["_.x != 'ok'", { x: "no" }, true],
    ["_.x >= 3", { x: 3 }, true],
    ["_.x < 3", { x: 2 }, true],
    ["_.includes('hello')", "say hello", true],
    ["_.startsWith('hel')", "hello", true],
    ["_.endsWith('lo')", "hello", true],
    ["_.x == _.y", { x: 1, y: 1 }, true],
    ["_ >= 3", 3, true],
    ["_ == null", null, true],
    ["_ == '3'", 3, false],
    ["_.includes(2)", [1, 2], true],
    ["_ == 'a || b'", "a || b", true],
    ["_ || false", "value", true],
    ["_.x >= 3 && _.x < 5", { x: 4 }, true],
    ["_.a || _.b && _.c", { a: false, b: true, c: false }, false],
    [
        "(_.name == 'ok') || (_.url.startsWith(\"http\"))",
        { name: "no", url: "https://example.com" },
        true,
    ],
])("evaluates magic expression %s", (source, value, expected) =>
    expect(expression(source)(value)).toBe(expected),
)

test("maps and filters with full expressions", () => {
    const values = [
        { x: "ok", n: 2 },
        { x: "no", n: 3 },
    ]
    expect(filter("_.x == 'ok'", values)).toEqual([values[0]])
    expect(map("_.n >= 3", values)).toEqual([false, true])
})

test("uses direct property access semantics", () =>
    expect(() => selector("_.author.name")({})).toThrow())

test.each([
    ["_.ok == true || _.missing.value == 1", true],
    ["_.ok == false && _.missing.value == 1", false],
])("short-circuits Boolean expression %s", (source, expected) =>
    expect(expression(source)({ ok: true })).toBe(expected),
)

test("does not invoke allowlisted method names on arbitrary objects", () =>
    expect(() => expression("_.includes('x')")({ includes: eval })).toThrow(
        "requires a string",
    ))

test.each(["url", "_.url()", "_.0", "_.foo-bar"])(
    "rejects unsupported selector %s",
    source => expect(() => selector(source)).toThrow("selector"),
)

test.each([
    "_.x === 'ok'",
    "_.x + 1",
    "_.includes()",
    "_.unknown('x')",
    `_.x == "\\q"`,
])("rejects unsupported expression %s", source =>
    expect(() => expression(source)).toThrow("expression"),
)

test.each(["one two", { one: 1 }])("rejects non-array input", value => {
    expect(() => map("_", value as any)).toThrow("array")
    expect(() => filter("_", value as any)).toThrow("array")
})

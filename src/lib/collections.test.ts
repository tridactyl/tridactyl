import { filter, map, selector } from "@src/lib/collections"

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

test("uses direct property access semantics", () =>
    expect(() => selector("_.author.name")({})).toThrow())

test.each(["url", "_.url()", "_.0", "_.foo-bar"])(
    "rejects unsupported selector %s",
    source => expect(() => selector(source)).toThrow("selector"),
)

test.each(["one two", { one: 1 }])("rejects non-array input", value => {
    expect(() => map("_", value as any)).toThrow("array")
    expect(() => filter("_", value as any)).toThrow("array")
})

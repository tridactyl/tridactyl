const ts = require("typescript")
const {
    applyAlias,
    supportState,
    transformDeclarations,
} = require("./generate_browser_types")

const emptyPolicy = { aliases: {}, unmapped: {} }

function compat(statement) {
    return { __compat: { support: { firefox: statement } } }
}

function compile(declarations, usage) {
    const files = new Map([
        ["/types/index.d.ts", declarations],
        ["/usage.ts", usage],
    ])
    const options = {
        noEmit: true,
        skipLibCheck: true,
        strict: true,
        target: ts.ScriptTarget.ES2020,
        types: [],
    }
    const host = ts.createCompilerHost(options)
    const fileExists = host.fileExists.bind(host)
    const getSourceFile = host.getSourceFile.bind(host)
    const readFile = host.readFile.bind(host)
    host.fileExists = fileName => files.has(fileName) || fileExists(fileName)
    host.readFile = fileName => files.get(fileName) || readFile(fileName)
    host.getSourceFile = (fileName, languageVersion, ...rest) =>
        files.has(fileName)
            ? ts.createSourceFile(
                  fileName,
                  files.get(fileName),
                  languageVersion,
              )
            : getSourceFile(fileName, languageVersion, ...rest)
    const program = ts.createProgram([...files.keys()], options, host)
    return ts
        .getPreEmitDiagnostics(program)
        .filter(diagnostic => diagnostic.file?.fileName === "/usage.ts")
        .map(diagnostic =>
            ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
        )
}

function generate(source, api, policy = emptyPolicy) {
    return transformDeclarations(source, "firefox", "100", api, policy)
}

test.each([
    [[{ version_added: false }, { version_added: "67" }], "supported"],
    [[{ version_added: false }, { version_added: "69" }], "tooRecent"],
    [{ version_added: "1", flags: [{}] }, "unsupported"],
    [{ version_added: "1", prefix: "moz" }, "unsupported"],
    [{ version_added: "1", alternative_name: "old" }, "unsupported"],
    [{ version_added: "1", partial_implementation: true }, "unsupported"],
    [{ version_added: "1", version_removed: "68" }, "unsupported"],
    [{ version_added: "1", version_removed: "69" }, "supported"],
    [{ version_added: "\u226467" }, "supported"],
    [{ version_added: "\u226469" }, "unsupported"],
    [{ version_added: 68 }, "supported"],
])("evaluates support case %# conservatively", (statement, expected) => {
    expect(supportState(statement, "68.0")).toBe(expected)
})

test("filters runtime declarations while preserving types and overloads", () => {
    const source = `
interface WebExtEvent<T extends (...args: any[]) => any> {
    addListener(callback: T): void;
}
declare namespace browser {
    namespace tabs {
        interface Options { enabled: boolean }
        function supported(value: string): void;
        function supported(value: number): void;
        function absent(): void;
        function tooNew(): void;
        const present: number, absentConst: number;
        const onAbsent: WebExtEvent<() => void>;
    }
}
`
    const api = {
        tabs: {
            absent: compat({ version_added: false }),
            absentConst: compat({ version_added: false }),
            onAbsent: compat({ version_added: false }),
            present: compat({ version_added: "1" }),
            supported: compat({ version_added: "1" }),
            tooNew: compat({ version_added: "101" }),
        },
    }
    const { text, report } = generate(source, api)

    expect(text.match(/function supported/g) || []).toHaveLength(2)
    expect(text).toContain("interface Options")
    expect(text).toContain("const present: number;")
    const supportedUsage = `
const options: browser.tabs.Options = { enabled: true };
browser.tabs.supported("yes");
browser.tabs.supported(1);
browser.tabs.present;
`
    expect(compile(text, supportedUsage)).toEqual([])

    const unsupportedUsage = `
browser.tabs.absent();
browser.tabs.tooNew();
browser.tabs.absentConst;
browser.tabs.onAbsent.addListener(() => undefined);
`
    const errors = compile(text, unsupportedUsage)
    for (const name of ["absent", "tooNew", "absentConst", "onAbsent"]) {
        expect(errors.join("\n")).toContain(name)
    }
    expect(report.removed).toEqual([
        { path: "tabs.absent", reason: "unsupported" },
        { path: "tabs.absentConst", reason: "unsupported" },
        { path: "tabs.onAbsent", reason: "unsupported" },
        { path: "tabs.tooNew", reason: "tooRecent" },
    ])
})

test("maps dotted contextMenus declarations to menus BCD", () => {
    const source = `
declare namespace browser.contextMenus {
    interface CreateProperties { title: string }
    function create(properties: CreateProperties): void;
}
`
    const result = generate(
        source,
        {
            menus: {
                create: compat({
                    version_added: "1",
                    alternative_name: "contextMenus.create",
                }),
            },
        },
        { aliases: { contextMenus: "menus" }, unmapped: {} },
    )
    expect(applyAlias("contextMenus.create", { contextMenus: "menus" })).toBe(
        "menus.create",
    )
    const usage = `browser.contextMenus.create({ title: "x" });`
    expect(compile(result.text, usage)).toEqual([])
    expect(result.report.retained).toEqual([
        { path: "contextMenus.create", reason: "supported" },
    ])
})

test("an unavailable parent overrides an unmapped child policy", () => {
    const source = `declare namespace browser.windows { const mode: string; }`
    const api = {
        windows: {
            __compat: { support: { firefox: { version_added: false } } },
        },
    }
    const policy = {
        aliases: {},
        unmapped: { "windows.mode": ["firefox"] },
    }
    const result = generate(source, api, policy)
    expect(compile(result.text, "browser.windows.mode")).not.toEqual([])
    expect(result.report.removed).toEqual([
        { path: "windows.mode", reason: "unsupported" },
    ])
})

test("fails on unmapped policy drift and permits explicit policy", () => {
    const source = `declare namespace browser.future { const value: number; }`
    const withUnmapped = (...paths) => ({
        aliases: {},
        unmapped: Object.fromEntries(
            paths.map(apiPath => [apiPath, ["firefox"]]),
        ),
    })
    expect(() => generate(source, {}, withUnmapped())).toThrow(
        /unlisted: future\.value/,
    )

    const result = generate(source, {}, withUnmapped("future.value"))
    expect(result.text).toContain("const value")
    expect(result.report.retained).toEqual([
        { path: "future.value", reason: "unmapped-retained" },
    ])
    const stale = withUnmapped("future.value", "past.value")
    expect(() => generate(source, {}, stale)).toThrow(/stale: past\.value/)
})

test("applies unmapped policy per target", () => {
    const source = `declare namespace browser.future { const value: number; }`
    const policy = {
        aliases: {},
        unmapped: { "future.value": ["chrome"] },
    }
    const firefox = generate(source, {}, policy)
    const chrome = transformDeclarations(source, "chrome", "100", {}, policy)

    expect(compile(firefox.text, "browser.future.value")).not.toEqual([])
    expect(compile(chrome.text, "browser.future.value")).toEqual([])
})

test.each([
    ["non-array values", "retain"],
    ["unknown targets", ["safari"]],
    ["duplicate targets", ["firefox", "firefox"]],
])("rejects %s in unmapped policy", (_description, retainedTargets) => {
    const source = `declare namespace browser.future { const value: number; }`
    const policy = {
        aliases: {},
        unmapped: { "future.value": retainedTargets },
    }
    expect(() => generate(source, {}, policy)).toThrow(/invalid: future\.value/)
})

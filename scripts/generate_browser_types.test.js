const crypto = require("crypto")
const ts = require("typescript")
const bcd = require("@mdn/browser-compat-data")
const declarationVersion = require("@types/firefox-webext-browser/package.json").version
const {
    applyAlias,
    supportState,
    transformCompatDeclaration,
    transformDeclarations,
    validateNestedDefaults,
    validateNestedPolicy,
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
        .filter(diagnostic => files.has(diagnostic.file?.fileName))
        .map(diagnostic =>
            ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
        )
}

function compileModule(declarations, usage) {
    return compile(
        `declare module "compat" { ${declarations} }`,
        `import * as compat from "compat"; ${usage}`,
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

test("gates platform-only compat methods behind a shared-source capability", () => {
    const source = `
declare const firefoxDesktopApis: {
    tabs: { hide(ids: number[]): Promise<void> };
};
export type FirefoxDesktopApis = typeof firefoxDesktopApis;
export declare function requireFirefoxDesktop(): Promise<FirefoxDesktopApis>;
export declare const tabs: {
    hide(ids: number[]): Promise<void>;
    query(): Promise<void>;
};
`
    const api = {
        tabs: {
            hide: {
                __compat: {
                    support: {
                        chrome: { version_added: false },
                        firefox: { version_added: "1" },
                        firefox_android: { version_added: false },
                    },
                },
            },
            query: {
                __compat: {
                    support: {
                        chrome: { version_added: "1" },
                        firefox: { version_added: "1" },
                        firefox_android: { version_added: "1" },
                    },
                },
            },
        },
    }
    const policy = {
        aliases: {},
        compat_exports: ["requireFirefoxDesktop"],
        compat: {
            "tabs.hide": {
                api: "tabs.hide",
                targets: {
                    chrome: "unavailable",
                    firefox: "native",
                    firefox_android: "firefoxDesktop",
                },
            },
            "tabs.query": {
                targets: {
                    chrome: "native",
                    firefox: "native",
                    firefox_android: "native",
                },
            },
        },
    }
    const android = transformCompatDeclaration(
        source,
        "firefox_android",
        "113",
        api,
        policy,
    )
    const firefox = transformCompatDeclaration(
        source,
        "firefox",
        "94",
        api,
        policy,
    )
    const chrome = transformCompatDeclaration(
        source,
        "chrome",
        "114",
        api,
        policy,
    )

    expect(compileModule(android, "compat.tabs.query()")).toEqual([])
    expect(compileModule(android, "compat.tabs.hide([])").join("\n")).toContain(
        "hide",
    )
    expect(
        compileModule(
            android,
            "compat.requireFirefoxDesktop().then(api => api.tabs.hide([]))",
        ),
    ).toEqual([])
    expect(compileModule(firefox, "compat.tabs.hide([])")).toEqual([])
    expect(compileModule(chrome, "compat.tabs.hide([])")).not.toEqual([])

    const proxy = `${android}
type Methods<T> = { [K in keyof T as T[K] extends (...args: any[]) => any ? K : never]: T[K] };
export declare const proxy: { tabs: Methods<typeof tabs> };
`
    expect(compileModule(proxy, "compat.proxy.tabs.query()")).toEqual([])
    expect(compileModule(proxy, "compat.proxy.tabs.hide([])")).not.toEqual([])
})

test("retains declared compat fallbacks and rejects policy drift", () => {
    const source = `export declare const find: {
        find(query: string): Promise<void>;
    };`
    const api = { find: { find: compat({ version_added: false }) } }
    const entry = {
        api: "find.find",
        targets: {
            chrome: "unavailable",
            firefox: "native",
            firefox_android: "fallback",
        },
    }
    const policy = { aliases: {}, compat: { "find.find": entry } }

    const android = transformCompatDeclaration(
        source,
        "firefox_android",
        "113",
        api,
        policy,
    )
    expect(compileModule(android, 'compat.find.find("query")')).toEqual([])
    expect(() =>
        transformCompatDeclaration(source, "firefox", "94", api, {
            aliases: {},
            compat: {},
        }),
    ).toThrow(/unlisted: find\.find/)
})

test("rejects compat methods missing from their declared capability", () => {
    const source = `export declare const tabs: {
        hide(ids: number[]): Promise<void>;
    };`
    const api = { tabs: { hide: compat({ version_added: "1" }) } }
    const policy = {
        aliases: {},
        compat: {
            "tabs.hide": {
                api: "tabs.hide",
                targets: {
                    chrome: "unavailable",
                    firefox: "native",
                    firefox_android: "firefoxDesktop",
                },
            },
        },
    }
    expect(() =>
        transformCompatDeclaration(source, "firefox", "94", api, policy),
    ).toThrow(/capability drift.*tabs\.hide/)
})

test("rejects unlisted exported compat functions", () => {
    expect(() =>
        transformCompatDeclaration(
            `export declare function hiddenAdapter(): void;`,
            "firefox",
            "94",
            {},
            { aliases: {}, compat: {}, compat_exports: [] },
        ),
    ).toThrow(/Compat export policy drift.*hiddenAdapter/)
})

test("filters versioned parameter, result, callback, and event filter fields", () => {
    const source = `
interface WebExtEvent<T extends (...args: any[]) => any> {
    addListener(callback: T): void;
}
declare namespace browser.tabs {
    interface _CreateCreateProperties { old?: boolean; fresh?: boolean }
    interface Tab { oldResult?: boolean; freshResult?: boolean }
    interface _OnUpdatedChangeInfo { oldChange?: boolean; freshChange?: boolean }
    interface LocalResult { oldLocal?: boolean; freshLocal?: boolean }
    interface UpdateFilter { properties?: string[] }
    interface _TabsOnUpdatedEvent {
        addListener(
            callback: (tabId: number, changeInfo: _OnUpdatedChangeInfo) => void,
            filter?: UpdateFilter,
        ): void;
    }
    function create(options: _CreateCreateProperties): Promise<Tab>;
    function execute(): Promise<LocalResult>;
    const onUpdated: _TabsOnUpdatedEvent;
}
`
    const api = {
        tabs: {
            create: {
                ...compat({ version_added: "1" }),
                old: compat({ version_added: "1" }),
                fresh: compat({ version_added: "101" }),
            },
            execute: {
                ...compat({ version_added: "1" }),
                LocalResult: {
                    oldLocal: compat({ version_added: "1" }),
                    freshLocal: compat({ version_added: "101" }),
                },
            },
            Tab: {
                oldResult: compat({ version_added: "1" }),
                freshResult: compat({ version_added: "101" }),
            },
            onUpdated: {
                ...compat({ version_added: "1" }),
                changeInfo: {
                    oldChange: compat({ version_added: "1" }),
                    freshChange: compat({ version_added: "101" }),
                },
                filter: compat({ version_added: false }),
            },
        },
    }
    const { text } = generate(source, api)

    expect(
        compile(
            text,
            `
browser.tabs.create({ old: true }).then(tab => tab.oldResult);
browser.tabs.execute().then(result => result.oldLocal);
browser.tabs.onUpdated.addListener((_id, info) => info.oldChange);
`,
        ),
    ).toEqual([])
    for (const usage of [
        `browser.tabs.create({ fresh: true });`,
        `browser.tabs.create({}).then(tab => tab.freshResult);`,
        `browser.tabs.execute().then(result => result.freshLocal);`,
        `browser.tabs.onUpdated.addListener((_id, info) => info.freshChange);`,
        `browser.tabs.onUpdated.addListener(() => undefined, {});`,
    ]) {
        expect(compile(text, usage)).not.toEqual([])
    }
})

test("uses the conservative intersection of shared interface contexts", () => {
    const source = `
declare namespace browser.example {
    interface SharedOptions { stable?: boolean; contextual?: boolean }
    function first(options: SharedOptions): void;
    function second(options: SharedOptions): void;
}
`
    const api = {
        example: {
            first: {
                ...compat({ version_added: "1" }),
                options: {
                    stable: compat({ version_added: "1" }),
                    contextual: compat({ version_added: "1" }),
                },
            },
            second: {
                ...compat({ version_added: "1" }),
                options: {
                    stable: compat({ version_added: "1" }),
                    contextual: compat({ version_added: false }),
                },
            },
        },
    }
    const { text } = generate(source, api)

    expect(
        compile(
            text,
            `browser.example.first({ stable: true, contextual: true })`,
        ),
    ).not.toEqual([])
})

test("maps flattened parameter, value, and result property BCD keys", () => {
    const source = `
declare namespace browser.encoded {
    interface Update { stable?: boolean; fresh?: boolean }
    interface Details { stable?: boolean; windowId?: number }
    interface Mismatched { stable?: boolean; fresh?: boolean }
    interface SiblingFilter { stable?: boolean }
    interface SiblingDetails { stable?: boolean; keep?: string }
    interface Settings { stable?: boolean; fresh?: boolean }
    function update(updateProperties: Update): void;
    function action(details: Details): void;
    function mismatch(params: Mismatched): void;
    function siblings(filter: SiblingFilter, details: SiblingDetails): void;
    function get(): Promise<Settings>;
}
`
    const api = {
        encoded: {
            update: {
                ...compat({ version_added: "1" }),
                stable_value: compat({ version_added: "1" }),
                fresh_value: compat({ version_added: "101" }),
            },
            action: {
                ...compat({ version_added: "1" }),
                details_stable_parameter: compat({ version_added: "1" }),
                details_windowId_parameter: compat({ version_added: false }),
            },
            mismatch: {
                ...compat({ version_added: "1" }),
                options: {
                    stable: compat({ version_added: "1" }),
                    fresh: compat({ version_added: "101" }),
                },
            },
            siblings: {
                ...compat({ version_added: "1" }),
                stable: compat({ version_added: false }),
                filter: { stable: compat({ version_added: "1" }) },
                details: {
                    stable: compat({ version_added: false }),
                    keep: compat({ version_added: "1" }),
                },
            },
            get: {
                ...compat({ version_added: "1" }),
                returns_settings_stable_property: compat({ version_added: "1" }),
                returns_settings_fresh_property: compat({ version_added: "101" }),
            },
        },
    }
    const { text } = generate(source, api)

    expect(
        compile(
            text,
            `
browser.encoded.update({ stable: true });
browser.encoded.action({ stable: true });
browser.encoded.mismatch({ stable: true });
browser.encoded.siblings({ stable: true }, { keep: "yes" });
browser.encoded.get().then(settings => settings.stable);
`,
        ),
    ).toEqual([])
    for (const usage of [
        `browser.encoded.update({ fresh: true });`,
        `browser.encoded.action({ stable: true, windowId: 1 });`,
        `browser.encoded.mismatch({ fresh: true });`,
        `browser.encoded.siblings({}, { keep: "yes", stable: true });`,
        `browser.encoded.get().then(settings => settings.fresh);`,
    ]) {
        expect(compile(text, usage)).not.toEqual([])
    }
})

test("filters whole parameters, inline event callbacks, runtime objects, and nested options", () => {
    const source = `
interface WebExtEvent<T extends (...args: any[]) => any> {
    addListener(callback: T): void;
}
declare namespace browser.deep {
    interface Inner { stable?: boolean; fresh?: boolean }
    interface Options { inner?: Inner }
    interface Area { stable(): void; fresh(): void }
    interface _RemoveReturnDetails { stable?: boolean; fresh?: boolean }
    type Choice = "stable" | "fresh";
    function optional(value: string, options?: Options): void;
    function nested(options: Options): void;
    function choose(value: Choice): void;
    function optionalMany(value: string, first?: boolean, second?: boolean): void;
    function remove(): Promise<_RemoveReturnDetails>;
    const local: Area;
    const onDone: WebExtEvent<(id: string, first: boolean, second: boolean) => void>, unavailable: number;
}
`
    const api = {
        deep: {
            optional: {
                ...compat({ version_added: "1" }),
                options: compat({ version_added: false }),
            },
            nested: {
                ...compat({ version_added: "1" }),
                options: {
                    inner: {
                        stable: compat({ version_added: "1" }),
                        fresh: compat({ version_added: "101" }),
                    },
                },
            },
            choose: compat({ version_added: "1" }),
            Choice: {
                stable: compat({ version_added: "1" }),
                fresh: compat({ version_added: "101" }),
            },
            optionalMany: {
                ...compat({ version_added: "1" }),
                first: compat({ version_added: false }),
                second: compat({ version_added: false }),
            },
            remove: {
                ...compat({ version_added: "1" }),
                stable: compat({ version_added: "1" }),
                fresh: compat({ version_added: "101" }),
            },
            local: compat({ version_added: "1" }),
            Area: {
                stable: compat({ version_added: "1" }),
                fresh: compat({ version_added: "101" }),
            },
            onDone: {
                ...compat({ version_added: "1" }),
                first: compat({ version_added: false }),
                second: compat({ version_added: false }),
            },
            unavailable: compat({ version_added: false }),
        },
    }
    const { text } = generate(source, api)

    expect(
        compile(
            text,
            `
browser.deep.optional("value");
browser.deep.nested({ inner: { stable: true } });
browser.deep.choose("stable");
browser.deep.optionalMany("value");
browser.deep.remove().then(result => result.stable);
browser.deep.local.stable();
browser.deep.onDone.addListener(id => undefined);
`,
        ),
    ).toEqual([])
    for (const usage of [
        `browser.deep.optional("value", {});`,
        `browser.deep.nested({ inner: { fresh: true } });`,
        `browser.deep.choose("fresh");`,
        `browser.deep.optionalMany("value", true);`,
        `browser.deep.remove().then(result => result.fresh);`,
        `browser.deep.local.fresh();`,
        `browser.deep.onDone.addListener((_id, first) => first);`,
        `browser.deep.unavailable;`,
    ]) {
        expect(compile(text, usage)).not.toEqual([])
    }
})

test("filters callback behavior, alias unions, nested results, and unsupported ancestors", () => {
    const source = `
interface WebExtEvent<T extends (...args: any[]) => any> {
    addListener(callback: T): void;
}
declare namespace browser.precise {
    interface DefaultEvent<T = (input: CanonicalInput, unavailable?: string) => CallbackResult | Promise<CallbackResult>> {
        addListener(callback: T): void;
    }
    interface SharedDefaultEvent<T = () => Promise<string>> {
        addListener(callback: T): void;
    }
    interface MultiEvent<Tag, T = () => string | Promise<string>> {
        addListener(callback: T): void;
    }
    interface CallableListener {
        (input: CanonicalInput, unavailable?: string): CallbackResult | Promise<CallbackResult>;
    }
    interface BaseCallable { (): string | Promise<string> }
    interface OverloadedListener extends BaseCallable {
        (value: string): string | Promise<string>;
        (value: number): string | Promise<string>;
    }
    type NamedListener = CallableListener;
    interface Hidden { child: boolean }
    interface Item { stable: boolean; fresh: boolean }
    interface CanonicalInput { stable: boolean; fresh: boolean }
    interface CallbackItem { stable: boolean; fresh: boolean }
    interface CallbackResult { stable: boolean; fresh: boolean }
    interface Change { stable?: boolean }
    interface _OnExplicitDetails { stable?: boolean }
    interface Result { items: Item[] }
    interface OnClickData { button: number }
    type ContextType = _ContextType;
    type _ContextType = "stable" | "fresh";
    function context(value: ContextType): void;
    function canonical(options: CanonicalInput): void;
    function get(): Promise<Result>;
    function useExplicit(details: _OnExplicitDetails): void;
    const local: Hidden;
    const onClick: WebExtEvent<(id: string, info?: OnClickData) => void>;
    const onMessage: WebExtEvent<(message: string) => boolean | Promise<any> | void>;
    const onItems: WebExtEvent<(use: (items: CallbackItem[]) => void) => void>;
    const onRemoved: WebExtEvent<(id: string, options?: CanonicalInput) => void>;
    const onDefault: DefaultEvent;
    const onPreservedDefault: SharedDefaultEvent;
    const onExplicit: SharedDefaultEvent<() => string | Promise<string>>;
    const onMulti: MultiEvent<"tag">;
    const onNamed: WebExtEvent<NamedListener>;
    const onOverloaded: WebExtEvent<OverloadedListener>;
    const onSibling: WebExtEvent<(change: Change, input: CanonicalInput) => void>;
}
`
    const api = {
        precise: {
            context: compat({ version_added: "1" }),
            canonical: compat({ version_added: "1" }),
            CanonicalInput: {
                ...compat({ version_added: "1" }),
                stable: compat({ version_added: "1" }),
                fresh: compat({ version_added: false }),
            },
            ContextType: {
                stable: compat({ version_added: "1" }),
                fresh: compat({ version_added: false }),
            },
            get: compat({ version_added: "1" }),
            useExplicit: {
                ...compat({ version_added: "1" }),
                details: { stable: compat({ version_added: "1" }) },
            },
            Item: {
                ...compat({ version_added: "1" }),
                stable: compat({ version_added: "1" }),
                fresh: compat({ version_added: false }),
            },
            local: compat({ version_added: "1" }),
            Hidden: compat({ version_added: false }),
            onClick: {
                ...compat({ version_added: "1" }),
                OnClickData: compat({ version_added: false }),
            },
            onMessage: {
                ...compat({ version_added: "1" }),
                return_promise: compat({ version_added: false }),
            },
            onItems: compat({ version_added: "1" }),
            CallbackItem: {
                ...compat({ version_added: "1" }),
                stable: compat({ version_added: "1" }),
                fresh: compat({ version_added: false }),
            },
            onRemoved: {
                ...compat({ version_added: "1" }),
                options: compat({ version_added: false }),
            },
            onDefault: {
                ...compat({ version_added: "1" }),
                unavailable: compat({ version_added: false }),
            },
            onPreservedDefault: {
                ...compat({ version_added: "1" }),
                return_promise: compat({ version_added: "1" }),
            },
            onExplicit: {
                ...compat({ version_added: "1" }),
                details: { stable: compat({ version_added: false }) },
                return_promise: compat({ version_added: false }),
            },
            onMulti: {
                ...compat({ version_added: "1" }),
                return_promise: compat({ version_added: false }),
            },
            onNamed: {
                ...compat({ version_added: "1" }),
                unavailable: compat({ version_added: false }),
                return_promise: compat({ version_added: false }),
            },
            onOverloaded: {
                ...compat({ version_added: "1" }),
                return_promise: compat({ version_added: false }),
            },
            CallbackResult: {
                ...compat({ version_added: "1" }),
                stable: compat({ version_added: "1" }),
                fresh: compat({ version_added: false }),
            },
            onSibling: {
                ...compat({ version_added: "1" }),
                change: { stable: compat({ version_added: false }) },
            },
        },
    }
    const { text } = generate(source, api, {
        ...emptyPolicy,
        nested_defaults: { targets: ["firefox"] },
        nested_unmapped: { "precise.onDefault.return_promise": [] },
    })

    expect(
        compile(
            text,
            `
browser.precise.context("stable");
browser.precise.canonical({ stable: true });
browser.precise.get().then(result => result.items[0].stable);
browser.precise.useExplicit({ stable: true });
browser.precise.onClick.addListener(id => undefined);
browser.precise.onMessage.addListener(() => true);
browser.precise.onItems.addListener(use => use([{ stable: true }]));
browser.precise.onRemoved.addListener(id => undefined);
browser.precise.onDefault.addListener(() => ({ stable: true }));
browser.precise.onPreservedDefault.addListener(() => Promise.resolve("ok"));
browser.precise.onExplicit.addListener(() => "ok");
browser.precise.onMulti.addListener(() => "ok");
browser.precise.onNamed.addListener(() => ({ stable: true }));
browser.precise.onOverloaded.addListener(() => "ok");
browser.precise.onSibling.addListener((_change, input) => input.stable);
`,
        ),
    ).toEqual([])
    for (const usage of [
        `browser.precise.context("fresh");`,
        `browser.precise.canonical({ stable: true, fresh: true });`,
        `browser.precise.get().then(result => result.items[0].fresh);`,
        `browser.precise.local.child;`,
        `browser.precise.onClick.addListener((_id, info) => info?.button);`,
        `browser.precise.onMessage.addListener(() => Promise.resolve());`,
        `browser.precise.onItems.addListener(use => use([{ stable: true, fresh: true }]));`,
        `browser.precise.onRemoved.addListener((_id, options) => options?.stable);`,
        `browser.precise.onDefault.addListener(() => { const result: browser.precise.CallbackResult = { stable: true, fresh: true }; return result; });`,
        `browser.precise.onDefault.addListener((_input, unavailable) => ({ stable: unavailable.length > 0 }));`,
        `browser.precise.onDefault.addListener(() => Promise.resolve({ stable: true }));`,
        `browser.precise.onExplicit.addListener(() => Promise.resolve("no"));`,
        `browser.precise.onMulti.addListener(() => Promise.resolve("no"));`,
        `browser.precise.onNamed.addListener((_input, unavailable) => ({ stable: unavailable.length > 0 }));`,
        `browser.precise.onNamed.addListener(() => Promise.resolve({ stable: true }));`,
        `type Result = Extract<ReturnType<browser.precise.BaseCallable>, Promise<string>>; const result: Result = Promise.resolve("no");`,
        `type Result = Extract<ReturnType<browser.precise.OverloadedListener>, Promise<string>>; const result: Result = Promise.resolve("no");`,
        `browser.precise.onSibling.addListener(change => change.stable);`,
    ]) {
        expect(compile(text, usage)).not.toEqual([])
    }
})

test("removes unknown nested fields unless target policy retains them", () => {
    const source = `
declare namespace browser.example {
    interface Options { stable?: boolean; unknown?: boolean }
    function run(options: Options): void;
}
`
    const api = {
        example: {
            run: {
                ...compat({ version_added: "1" }),
                options: { stable: compat({ version_added: "1" }) },
            },
        },
    }
    const usage = `browser.example.run({ stable: true, unknown: true })`

    expect(compile(generate(source, api).text, usage)).not.toEqual([])
    expect(
        compile(
            generate(source, api, {
                ...emptyPolicy,
                nested_unmapped: {
                    "example.run.options.unknown": ["firefox"],
                },
            }).text,
            usage,
        ),
    ).toEqual([])
    expect(
        compile(
            generate(source, api, {
                ...emptyPolicy,
                nested_defaults: { targets: ["firefox"] },
            }).text,
            usage,
        ),
    ).toEqual([])
})

test("rejects stale nested policy", () => {
    expect(() =>
        validateNestedPolicy(
            {
                firefox: {
                    nested: { retained: [], removed: [] },
                },
            },
            { nested_unmapped: { "example.run.options.unknown": ["firefox"] } },
        ),
    ).toThrow(/Nested unmapped policy drift.*stale/)
})

test("rejects nested defaults when the declaration fingerprint changes", () => {
    expect(() =>
        validateNestedDefaults("changed", {
            nested_defaults: {
                bcdVersion: bcd.__meta.version,
                declarationVersion,
                sha256: "outdated",
                targets: ["firefox"],
            },
        }),
    ).toThrow(/Nested default policy drift/)
})

test("includes generated declarations in the nested inventory fingerprint", () => {
    const source = "current"
    const report = {
        declarationSha256: "current",
        nested: {
            retained: [
                {
                    mapped: false,
                    path: "example.run.options",
                    reason: "inherited-parent",
                },
            ],
            removed: [],
        },
    }
    const nestedSha256 = crypto
        .createHash("sha256")
        .update(
            [
                "firefox:declaration:current",
                "firefox:example.run.options:false:inherited-parent",
            ].join("\n"),
        )
        .digest("hex")
    const mappingPolicy = {
        nested_defaults: {
            bcdVersion: bcd.__meta.version,
            declarationVersion,
            nestedSha256,
            sha256: crypto.createHash("sha256").update(source).digest("hex"),
            targets: ["firefox"],
        },
    }
    expect(() =>
        validateNestedDefaults(source, mappingPolicy, { firefox: report }),
    ).not.toThrow()
    report.declarationSha256 = "changed"
    expect(() =>
        validateNestedDefaults(source, mappingPolicy, { firefox: report }),
    ).toThrow(/Nested inventory policy drift/)
})

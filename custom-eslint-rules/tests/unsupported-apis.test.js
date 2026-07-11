const { Linter } = require("eslint")
const unsupportedApis = require("../lib/unsupported-apis")

function compat(support) {
    return { __compat: { support } }
}

function verify(code, api, browser = "firefox", minimumVersion = "68") {
    const linter = new Linter()
    linter.defineRule("unsupported", unsupportedApis(browser, api))
    return linter.verify(code, {
        parserOptions: { ecmaVersion: 2020 },
        rules: { unsupported: ["error", { minimumVersion }] },
    })
}

test("detects browser, browserBg, and computed API access", () => {
    const api = { tabs: { hide: compat({ firefox: { version_added: false } }) } }
    const messages = verify(
        'browser.tabs.hide(); browserBg.tabs.hide(); browser["tabs"]["hide"]()',
        api,
    )
    expect(messages.map(message => message.messageId)).toEqual([
        "unsupportedApis",
        "unsupportedApis",
        "unsupportedApis",
    ])
})

test("checks target minimum versions", () => {
    const api = {
        tabs: {
            old: compat({ firefox: { version_added: "67" } }),
            exact: compat({ firefox: { version_added: "68" } }),
            recent: compat({ firefox: { version_added: "69" } }),
        },
    }
    const messages = verify(
        "browser.tabs.old; browser.tabs.exact; browser.tabs.recent",
        api,
    )
    expect(messages).toHaveLength(1)
    expect(messages[0].messageId).toBe("apiTooRecent")
})

test.each([
    ["missing target", undefined],
    ["null", null],
    ["removed", { version_added: "1", version_removed: "60" }],
    ["qualified", { version_added: "1", flags: [{ type: "preference" }] }],
    ["non-numeric", { version_added: "preview" }],
])("treats %s BCD conservatively", (_name, statement) => {
    const api = { tabs: { test: compat({ firefox: statement }) } }
    expect(verify("browser.tabs.test", api)[0].messageId).toBe(
        "unsupportedApis",
    )
})

test("accepts a supported unqualified statement from an array", () => {
    const api = {
        tabs: {
            test: compat({
                firefox: [
                    { version_added: false },
                    { version_added: "67" },
                ],
            }),
        },
    }
    expect(verify("browser.tabs.test", api)).toHaveLength(0)
})

test("keeps platform suppressions independent", () => {
    const api = {
        tabs: {
            test: compat({
                firefox: { version_added: false },
                chrome: { version_added: false },
            }),
        },
    }
    const linter = new Linter()
    linter.defineRule("unsupported-firefox", unsupportedApis("firefox", api))
    linter.defineRule("unsupported-chrome", unsupportedApis("chrome", api))
    const messages = linter.verify(
        "// eslint-disable-next-line unsupported-firefox\nbrowser.tabs.test",
        {
            parserOptions: { ecmaVersion: 2020 },
            rules: {
                "unsupported-firefox": "error",
                "unsupported-chrome": "error",
            },
        },
    )
    expect(messages).toHaveLength(1)
    expect(messages[0].ruleId).toBe("unsupported-chrome")
})

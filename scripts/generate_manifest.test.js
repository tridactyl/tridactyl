const generateManifest = require("./generate_manifest")
const template = require("../src/manifest.json")

const androidKeys =
    "browser_action.default_area chrome_url_overrides commands omnibox sidebar_action version_name".split(
        " ",
    )
const androidPermissions =
    "bookmarks contextMenus contextualIdentities find history nativeMessaging search sessions tabHide topSites".split(
        " ",
    )

function remove(value, path) {
    const names = path.split(".")
    const property = names.pop()
    delete names.reduce((parent, name) => parent[name], value)[property]
}

test("generates distinct desktop and Android manifests", () => {
    const before = JSON.parse(JSON.stringify(template))
    const desktop = generateManifest(template, "firefox")
    const android = generateManifest(template, "firefox_android")

    const expectedDesktop = JSON.parse(JSON.stringify(template))
    expectedDesktop.browser_specific_settings.gecko.strict_min_version = "94.0"
    expect(desktop).toEqual(expectedDesktop)

    const expectedAndroid = JSON.parse(JSON.stringify(template))
    for (const key of androidKeys) remove(expectedAndroid, key)
    expectedAndroid.permissions = template.permissions.filter(
        permission => !androidPermissions.includes(permission),
    )
    expectedAndroid.browser_specific_settings = {
        gecko: {
            id: template.browser_specific_settings.gecko.id,
            strict_min_version: "113.0",
        },
        gecko_android: { strict_min_version: "113.0" },
    }
    expect(android).toEqual(expectedAndroid)
    expect(template).toEqual(before)
})

test.each(["unknown", "firefox,firefox_android"])(
    "rejects manifest target %s",
    target => expect(() => generateManifest(template, target)).toThrow(),
)

test.each([
    { excludeKeys: ["name", "name"] },
    { excludeKeys: ["missing"] },
    { excludePermissions: ["storage", "storage"] },
    { excludePermissions: ["missing"] },
])("rejects invalid exclusions", manifest => {
    const targetDefinitions = {
        test: {
            minimumVersion: "1",
            manifestVersionPath: ["minimum_version"],
            manifest,
        },
    }
    expect(() =>
        generateManifest(template, "test", targetDefinitions),
    ).toThrow()
})

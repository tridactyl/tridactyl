const childProcess = require("child_process")
const fs = require("fs")
const os = require("os")
const path = require("path")
const JSZip = require("jszip")
const generateManifest = require("./generate_manifest")
const { beta_version } = require("./version")
const targets = require("../browser-targets.json")

test("generates shared Firefox desktop and Android minimum versions", () => {
    const template = { browser_specific_settings: { gecko: { id: "test" } } }
    const manifest = generateManifest(template, ["firefox", "firefox_android"])

    expect(manifest.browser_specific_settings.gecko.strict_min_version).toBe(
        targets.firefox.minimumVersion,
    )
    expect(
        manifest.browser_specific_settings.gecko_android.strict_min_version,
    ).toBe(targets.firefox_android.minimumVersion)
    expect(template.browser_specific_settings.gecko.strict_min_version).toBeUndefined()
})

test("formats beta versions for Firefox manifests", () => {
    expect(beta_version("1.24.6", "42\n")).toBe("1.24.6pre42")
})

test("extracts the browser-specific XPI ID", async () => {
    const temporaryDirectory = fs.mkdtempSync(
        path.join(os.tmpdir(), "tridactyl-xpi-"),
    )
    try {
        const xpi = path.join(temporaryDirectory, "test.xpi")
        const zip = new JSZip()
        zip.file(
            "manifest.json",
            JSON.stringify({
                browser_specific_settings: { gecko: { id: "test@example.com" } },
            }),
        )
        fs.writeFileSync(xpi, await zip.generateAsync({ type: "nodebuffer" }))

        const id = childProcess.execFileSync(
            path.join(__dirname, "get_id_from_xpi.sh"),
            [xpi],
            { encoding: "utf8" },
        )
        expect(id.trim()).toBe("test@example.com")
    } finally {
        fs.rmSync(temporaryDirectory, { recursive: true, force: true })
    }
})

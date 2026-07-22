const { set_release_version } = require("./version")

test("manages major and minor release names", () => {
    const manifest = { version: "1.24.6", version_name: "1.24.6" }

    set_release_version(manifest, 1, "Carpenter")
    expect(manifest.version_name).toBe("1.25.0 Carpenter")

    set_release_version(manifest, 2)
    expect(manifest.version_name).toBe("1.25.1 Carpenter")

    set_release_version(manifest, 0, "Joiner")
    expect(manifest.version_name).toBe("2.0.0 Joiner")

    expect(() =>
        set_release_version({ version: "1.25.0" }, 2, "Carpenter"),
    ).toThrow()
})

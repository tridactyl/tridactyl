import { testAll, testAllObject } from "@src/lib/test_utils"
import { canonicaliseMapstr } from "@src/lib/keyseq"
import { default_config, getURL, get } from "@src/lib/config"
import * as tri_config from "@src/lib/config"
import { zip } from "ramda"

const tri = { config: tri_config }

const config = new default_config()
// todo: test subconfigs and platform_defaults
const nmaps = Object.keys(config.nmaps)

// Test that all of the default maps use the canonical representation (otherwise they won't work correctly, because Tridactyl expects the maps in the config to be canonical; which now that I write it, that does seem like an obvious foot-gun for if we ever change the canonicalisation algorithm).
//
// But, hey, at least with this test we are more likely to notice if that happens and either not change the canonicalisation algorithm or introduce a migration.
for (let mode of Object.keys(config).filter(x => x.match(/maps$/))) {
    const mapstrings = Object.keys(config[mode])
    testAll(canonicaliseMapstr, zip(mapstrings, mapstrings))
}

test("getURL in keymap and config", () => {
    const nmaps = getURL("https://web.whatsapp.com/", ["nmaps"])
    expect(nmaps.f).toBe("hint -c [tabindex]:not(.two)>div,a")

    const google = "https://www.google.com/"
    expect(getURL(google, ["followpagepatterns", "prev"])).toBe("Previous")
})

test("merge deep should keep null", () => {
    const a = {}
    const b = { n: null }
    const c = tri.config.mergeDeep({}, { n: null })
    expect(c).toEqual({ n: null })
})

test("get in default inherit keymap", () => {
    expect(config["vmaps"]["🕷🕷INHERITS🕷🕷"]).toBe("nmaps")
    expect("gt" in config["vmaps"]).toBe(false)
    expect(config["nmaps"].gt).toBeTruthy()

    const vmapsAfterInherit = get("vmaps")
    const nmaps = get("nmaps")
    expect(vmapsAfterInherit.gt).toBe(nmaps.gt)
})

test("keymap unbind default", () => {
    expect(config["exmaps"]["<Space>"]).toBe(
        tri.config.DEFAULTS.exmaps["<Space>"],
    )
    tri.config.set("exmaps", "<Space>", null)
    expect(tri.config.USERCONFIG.exmaps["<Space>"]).toBeNull()
    expect(tri.config.DEFAULTS.exmaps).toBeTruthy()

    const exmaps = get("exmaps")
    expect(exmaps["<Space>"]).toBeUndefined()
})

test("get in modified inherit keymap", () => {
    expect(config["vmaps"]["🕷🕷INHERITS🕷🕷"]).toBe("nmaps")
    expect("q" in config["vmaps"]).toBe(true)
    expect("q" in config["nmaps"]).toBe(false)

    // null in keymap: do nothing and shadow binding from keymap
    // undefined in keymap: do nothing but allow binding from parent keymap
    tri.config.set("vmaps", "q", null)
    expect(tri.config.USERCONFIG.vmaps.q).toBeNull()

    const vmapsAfterInherit = get("vmaps")
    expect(vmapsAfterInherit.q).toBeUndefined()
})

// should null cause problem in keymap? yes
// remove null in keymap?

test("mergeDeep should not pollute arguments", () => {
    const o1 = { n: { a: 1 } }
    const o2 = { n: { b: 2 } }
    const o3 = tri.config.mergeDeep(o1, o2)
    expect({ o1, o2, o3 }).toEqual({
        o1: { n: { a: 1 } },
        o2: { n: { b: 2 } },
        o3: { n: { a: 1, b: 2 } },
    })
})
// Object.create in mergeDeep

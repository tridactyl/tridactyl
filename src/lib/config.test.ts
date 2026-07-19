import { testAll, testAllObject } from "@src/lib/test_utils"
import { canonicaliseMapstr } from "@src/lib/keyseq"
import { default_config } from "@src/lib/config"
import * as tri_config from "@src/lib/config"
import { zip } from "ramda"

const tri = { config: tri_config }
const { getURL, get } = tri.config

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

test("getURL in keymap and config in mock mode", () => {
    mockUrl("https://web.whatsapp.com/", () => {
        const nmaps = get("nmaps")
        expect(nmaps.f).toBe("hint -c [tabindex]:not(.two)>div,a")
    })
    mockUrl("https://www.google.com/", () => {
        expect(get("followpagepatterns", "prev")).toBe("Previous")
    })
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

    tri.config.set("vmaps", "q", null)
    expect(tri.config.USERCONFIG.vmaps.q).toBeNull()

    const vmapsAfterInherit = get("vmaps")
    expect(vmapsAfterInherit.q).toBeUndefined()
})

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

function mockUrl(u, fn) {
    const tri0 = window.tri
    window.tri = { contentLocation: { href: u } }
    fn()
    window.tri = tri0
}

test("merge object when default undefined", () => {
    const u = "youtube"
    const m = "mycustommaps"
    const cmd = "js alert(`j`)"
    const cmdk = "js alert(`k`)"
    expect(tri.config.DEFAULTS[m]).toBeUndefined()

    tri.config.set(m, "J", cmd)
    expect(tri.config.USERCONFIG[m]).toEqual({ J: cmd })
    expect(tri.config.DEFAULTS[m]).toBeUndefined()

    expect(tri.config.getDynamic(m)).toEqual({ J: cmd })
    expect(tri.config.getDynamic(m, "J")).toBe(cmd)

    tri.config.setURL(u, m, "K", cmdk)

    // what we fix is how the get() function merges user and site config
    // so we have to mock url for the get() instead of calling getURL
    mockUrl(u, () => {
        expect(tri.config.getDynamic(m)).toEqual({ J: cmd, K: cmdk })
        expect(tri.config.getDynamic(m, "J")).toBe(cmd)
        expect(tri.config.getDynamic(m, "K")).toBe(cmdk)
    })
})

test("merge object when user config undefined", () => {
    const u = "youtube"
    const obj = "followpagepatterns"
    const val = "go-next"
    const prev = tri.config.get(obj, "prev")
    expect(typeof tri.config.get(obj, "next")).toBe("string")
    const orig = tri.config.get(obj, "next")
    expect(tri.config.DEFAULTS[obj]["next"]).toBe(orig)
    expect(tri.config.USERCONFIG[obj]).toBeUndefined()

    tri.config.setURL(u, obj, "next", val)
    expect(tri.config.get(obj, "next")).toBe(orig)
    expect(tri.config.DEFAULTS[obj].next).toBe(orig)
    expect(tri.config.USERCONFIG[obj]).toBeUndefined()

    mockUrl(u, () => {
        expect(tri.config.get(obj, "next")).toBe(val)
        expect(tri.config.get(obj)).toEqual({ next: val, prev: prev })
    })

    expect(tri.config.USERCONFIG.subconfigs[u][obj]).toEqual({ next: val })
})

test("refuses to export versioned programs as legacy RC commands", () => {
    const nmaps = tri.config.USERCONFIG.nmaps
    tri.config.USERCONFIG.nmaps = {
        x: { source: "echo one\necho two", exversion: 2 },
    }
    try {
        expect(() => tri.config.parseConfig()).toThrow("cannot yet be exported")
    } finally {
        tri.config.USERCONFIG.nmaps = nmaps
    }
})

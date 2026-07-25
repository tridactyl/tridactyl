import { queryAndURLwrangler } from "@src/lib/webext"
import * as config from "@src/lib/config"
import * as Native from "@src/lib/native"

jest.mock("@src/lib/webext", () => ({
    ...jest.requireActual("@src/lib/webext"),
    activeTab: jest.fn().mockResolvedValue({ index: 0 }),
    activeTabId: jest.fn().mockResolvedValue(1),
    openInNewTab: jest.fn(),
    activeTabContainerId: jest.fn(),
    queryAndURLwrangler: jest.fn(),
}))

jest.mock("@src/lib/native", () => ({
    ...jest.requireActual("@src/lib/native"),
    ff_cmdline: jest.fn(),
    getrcpath: jest.fn(),
    nativegate: jest.fn(),
    read: jest.fn(),
    run: jest.fn(),
}))

jest.mock("@src/lib/containers", () => ({
    ...jest.requireActual("@src/lib/containers"),
    fuzzyMatch: jest.fn().mockReturnValue("firefox-container-111"),
}))

jest.mock("editor-adapter", () => ({ getEditor: jest.fn() }))
jest.mock("@src/content/commandline_content", () => ({}))

// Missing from jest-webextension-mock.
const tabEvent = { addListener: jest.fn() }
Object.assign(browser.tabs, {
    onDetached: tabEvent,
    onAttached: tabEvent,
    onActivated: tabEvent,
})
Object.assign(browser.runtime, { getPlatformInfo: jest.fn() })
Object.defineProperty(browser, "windows", {
    value: {
        create: jest.fn().mockResolvedValue({ tabs: [{ id: 42 }] }),
        getCurrent: jest.fn().mockReturnValue({ incognito: false }),
    },
})
Object.defineProperty(browser, "sessions", {
    value: { getTabValue: jest.fn(), setTabValue: jest.fn() },
})

const backgroundExcmds = require("@src/.excmds_background.generated")
const { jsb, nativeopen, quickmarkremove, set, tabopen, winopen } =
    backgroundExcmds
const { followpage, js, ttscontrol } = require("@src/.excmds_content.generated")

test.each([
    ["next", ["READ MORE", ">", ">>"], ["^next\\b", ">", "more"], 1],
    ["prev", ["<<", "<", "READ OLDER"], ["^prev\\b", "<", "older"], 1],
    ["next", ["READ MORE", ">", ">>"], ">|more", 2],
] as const)(
    "`followpage %s` selects the expected text match",
    async (rel, texts, patterns, expected) => {
        await config.set("followpagepatterns", rel, patterns)
        document.body.innerHTML = "<a></a><a></a><a></a>"
        const anchors = Array.from(document.querySelectorAll("a"))
        anchors.forEach((anchor, index) => (anchor.innerText = texts[index]))
        const click = jest.fn()
        anchors[expected].addEventListener("click", click)

        followpage(rel)

        expect(click).toHaveBeenCalled()
    },
)

test("`set` parses string and array followpage patterns", async () => {
    await set("followpagepatterns.next", '["next", ">"]')
    expect(config.get("followpagepatterns", "next")).toEqual(["next", ">"])
    await set("followpagepatterns.next", "[Nn]ext")
    expect(config.get("followpagepatterns", "next")).toBe("[Nn]ext")
    expect(() => set("followpagepatterns.next", "[1]")).toThrow()
})

test("`set` preserves deep custom arrays", async () => {
    await config.set("custom", "deep", "array", [0])
    await set("custom.deep.array", "[1,2]")

    expect(config.getDynamic("custom", "deep", "array")).toEqual([1, 2])
})

test.each(["invalid", "{}"])(
    "`set` rejects non-array custom array value %s",
    async value => {
        await config.set("custom", "deep", "array", [0])

        expect(() => set("custom.deep.array", value)).toThrow()
        expect(config.getDynamic("custom", "deep", "array")).toEqual([0])
    },
)

test.each(["none", "somecnt"])(
    '`tabopen("-c", "%s")` strips container arguments before URL handling',
    async container => {
        await tabopen("-c", container)

        expect(queryAndURLwrangler).toHaveBeenLastCalledWith([])
    },
)

test.each([
    ["js", js],
    ["jsb", jsb],
])("`%s -rc` caches RC-relative source", async (name, command) => {
    const filename = `${name}.js`
    jest.mocked(Native.getrcpath).mockResolvedValue("/config/tridactylrc")
    const read = jest.mocked(Native.read)
    read.mockClear().mockResolvedValue({
        cmd: "read",
        version: null,
        content: "null",
        code: 0,
    })

    for (const flag of ["-rc", "-rc", "-r", "-r"]) await command(flag, filename)

    expect(read).toHaveBeenCalledTimes(3)
    expect(read).toHaveBeenCalledWith(`/config/${filename}`)
})

test("`winopen` creates a neutral tab before navigating it", async () => {
    await winopen("https://example.com/")

    expect(browser.windows.create).toHaveBeenCalledWith({ url: "about:blank" })
    expect(browser.tabs.update).toHaveBeenCalledWith(42, {
        loadReplace: true,
        url: "https://example.com/",
    })
})

test("`nativeopen` targets the running macOS Firefox application", async () => {
    jest.mocked(browser.runtime.getPlatformInfo).mockResolvedValue({
        arch: "x86-64",
        os: "mac",
    })
    jest.mocked(Native.nativegate).mockResolvedValue(true)
    jest.mocked(Native.ff_cmdline).mockResolvedValue([
        "/Applications/Firefox",
        "Nightly.app/Contents/MacOS/firefox",
    ])

    await nativeopen("https://example.com/")

    expect(Native.run).toHaveBeenCalledWith(
        `osascript -e 'on run argv' -e 'tell application "Firefox Nightly" to open location item 1 of argv' -e 'end run' 'https://example.com/'`,
    )
})

test("`quickmarkremove` unbinds every quickmark mapping", async () => {
    const bindings = ["gnq", "goq", "gwq", "gpq"]
    for (const binding of bindings) await config.set("nmaps", binding, "open")

    await quickmarkremove("q")

    const maps = config.get("nmaps")
    expect(bindings.every(binding => maps[binding] === undefined)).toBe(true)
})

test.each([undefined, "", "qq"])("`quickmarkremove` rejects %p", async key => {
    await expect(quickmarkremove(key)).rejects.toThrow("quickmarkremove syntax")
})

test.each([
    ["play", "resume", false],
    ["pause", "pause", false],
    ["playpause", "pause", false],
    ["playpause", "resume", true],
    ["stop", "cancel", false],
])("`ttscontrol %s` calls %s", async (action, method, paused) => {
    const speechSynthesis = {
        cancel: jest.fn(),
        pause: jest.fn(),
        paused,
        resume: jest.fn(),
    }
    Object.assign(window, { speechSynthesis })

    await ttscontrol(action)

    expect(speechSynthesis[method]).toHaveBeenCalled()
})

test("`ttscontrol` rejects unknown actions", async () => {
    await expect(ttscontrol("invalid")).rejects.toThrow(
        "Unknown text-to-speech action: invalid",
    )
})

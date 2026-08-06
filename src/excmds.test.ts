import { queryAndURLwrangler } from "@src/lib/webext"
import * as webext from "@src/lib/webext"
import * as config from "@src/lib/config"
import * as Native from "@src/lib/native"
import * as Messaging from "@src/lib/messaging"
import * as DOM from "@src/lib/dom"
import * as Controller from "@src/lib/controller"
import state from "@src/state"

jest.mock("@src/lib/webext", () => ({
    ...jest.requireActual("@src/lib/webext"),
    activeTab: jest.fn().mockResolvedValue({ index: 0 }),
    activeTabId: jest.fn().mockResolvedValue(1),
    ownTab: jest.fn().mockResolvedValue({ id: 1 }),
    openInNewTab: jest.fn(),
    activeTabContainerId: jest.fn(),
    notBackground: jest.fn().mockReturnValue(false),
    queryAndURLwrangler: jest.fn(),
}))

jest.mock("@src/lib/messaging")
jest.mock("@src/background/config_rc")

jest.mock("@src/lib/native", () => ({
    ...jest.requireActual("@src/lib/native"),
    disconnectNativeControls: jest.fn(),
    ff_cmdline: jest.fn(),
    getrcpath: jest.fn(),
    nativegate: jest.fn(),
    read: jest.fn(),
    reconnectNativeControls: jest.fn(),
    run: jest.fn(),
    runAsync: jest.fn(),
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
Object.assign(browser.runtime, {
    getPlatformInfo: jest.fn(),
    sendNativeMessage: jest.fn(),
})
Object.assign(browser.commands, { update: jest.fn() })
Object.defineProperty(globalThis, "CSS", { value: {} })
Object.defineProperty(browser, "windows", {
    value: {
        create: jest.fn().mockResolvedValue({ tabs: [{ id: 42 }] }),
        getCurrent: jest.fn().mockReturnValue({ incognito: false }),
    },
})
Object.defineProperty(browser, "sessions", {
    value: { getTabValue: jest.fn(), setTabValue: jest.fn() },
})

webext.initLastAudibleTabTracking()
const backgroundExcmds = require("@src/.excmds_background.generated")
const { jsb, nativeopen, quickmarkremove, set, tabopen, unbind, winopen } =
    backgroundExcmds
const { followpage, js, ttscontrol } = require("@src/.excmds_content.generated")
const { focusinput, setmode } = require("@src/.excmds_content.generated")

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

test("`focusinput -l` restores the shared input selector", async () => {
    document.body.innerHTML =
        '<textarea id="fallback"></textarea><textarea id="remembered"></textarea>'
    state.lastInputSelector = '[id="remembered"]'
    const isSubstantial = jest.spyOn(DOM, "isSubstantial").mockReturnValue(true)

    await focusinput("-l")

    expect(document.activeElement.id).toBe("remembered")
    isSubstantial.mockRestore()
})

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

test("`colourscheme --url` only refetches with `--update`", async () => {
    const args = ["--module=reader", "--url=x", "issue5490"]
    const fetchMock = jest
        .fn()
        .mockResolvedValueOnce({ text: async () => "" })
        .mockResolvedValueOnce({ text: async () => "updated" })
    const originalFetch = globalThis.fetch
    globalThis.fetch = fetchMock

    try {
        await backgroundExcmds.colourscheme(...args)
        await backgroundExcmds.colourscheme(...args)
        expect(fetchMock).toHaveBeenCalledTimes(1)

        await backgroundExcmds.colourscheme("--update", ...args)
        expect(fetchMock).toHaveBeenCalledTimes(2)
    } finally {
        globalThis.fetch = originalFetch
        await config.unset("customthemes", args[2])
    }
})

test("`autocontaindelete` removes only the matching rule", async () => {
    const pattern = "^https?://([^/]*\\.|)one\\.example/"
    await config.set("autocontain", pattern, "work")
    await config.set("autocontain", "two.example", "personal")
    await backgroundExcmds.autocontaindelete("-s", "one\\.example")
    expect(config.get("autocontain", pattern)).toBeUndefined()
    expect(config.get("autocontain", "two.example")).toBe("personal")
})

test.each(["insert", "input", "ignore"])(
    "`setmode` can enable count awareness in %s mode",
    async mode => {
        await setmode(mode, "countaware", "true")
        expect(config.get("modesubconfigs", mode, "countaware")).toBe("true")
        await config.unset("modesubconfigs", mode, "countaware")
        expect(config.get("modesubconfigs", mode, "countaware")).toBe("false")
    },
)

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

test("`getLastAudibleTab` prioritises current audio, falls back, and forgets closed tabs", async () => {
    const currentTab = { id: 1, windowId: 10 } as browser.tabs.Tab
    const previousTab = { id: 2, windowId: 20 } as browser.tabs.Tab
    const onUpdated = browser.tabs.onUpdated.addListener as jest.Mock
    const onRemoved = browser.tabs.onRemoved.addListener as jest.Mock
    onUpdated.mock.calls[0][0](previousTab.id, { audible: false }, previousTab)
    jest.mocked(browser.tabs.query).mockResolvedValue([])
    jest.mocked(browser.tabs.query).mockResolvedValueOnce([currentTab])
    await expect(webext.getLastAudibleTab()).resolves.toBe(currentTab)
    jest.mocked(browser.tabs.get).mockResolvedValueOnce(previousTab)
    await expect(webext.getLastAudibleTab()).resolves.toBe(previousTab)
    jest.mocked(browser.tabs.get).mockRejectedValueOnce(new Error())
    await expect(webext.getLastAudibleTab()).resolves.toBeUndefined()
    onRemoved.mock.calls[0][0](previousTab.id)
    jest.mocked(browser.tabs.get).mockClear()
    await webext.getLastAudibleTab()
    expect(browser.tabs.get).not.toHaveBeenCalled()
})

test("`changelistjump` skips closed tabs", async () => {
    state.prevInputs = [
        { inputId: "open", tab: 1 },
        { inputId: "closed", tab: 2 },
    ]
    const update = jest.mocked(browser.tabs.update)
    update.mockClear().mockRejectedValueOnce(new Error("Invalid tab ID"))

    await backgroundExcmds.changelistjump()

    expect(update.mock.calls).toEqual([
        [2, { active: true }],
        [1, { active: true }],
    ])
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

test("`:native` reports native messaging errors", async () => {
    jest.mocked(browser.runtime.sendNativeMessage).mockRejectedValueOnce(
        new Error("native_main.py does not exist, or is not executable"),
    )

    await backgroundExcmds.native()

    expect(Messaging.messageActiveTab).toHaveBeenCalledWith(
        "excmd_content",
        "fillcmdline",
        [expect.stringMatching(/nativeinstall.*native_main\.py/)],
        undefined,
    )
})

test("`:native` reconnects native control after a successful check", async () => {
    const reconnect = jest.mocked(Native.reconnectNativeControls).mockClear()
    jest.mocked(browser.runtime.sendNativeMessage).mockResolvedValueOnce({
        version: "0.6.0",
    })

    await backgroundExcmds.native()

    expect(reconnect).toHaveBeenCalledWith(true)
})

test("native composite execution propagates command errors", async () => {
    const composite = backgroundExcmds.composite

    await expect(
        Controller.invokeExCmd(composite, ["not-a-real-excmd"], "native"),
    ).rejects.toThrow("Not an excmd")
})

test("native source is forwarded to content command shims", async () => {
    const messageActiveTab = jest.mocked(Messaging.messageActiveTab).mockClear()

    await Controller.invokeExCmd(
        backgroundExcmds.rssexec,
        ["https://example.com/feed"],
        "native",
    )

    expect(messageActiveTab).toHaveBeenCalledWith(
        "excmd_content",
        "rssexec",
        ["https://example.com/feed", undefined],
        "native",
    )
})

test("`updatenative` leaves control released while an asynchronous installer runs", async () => {
    jest.mocked(browser.runtime.getPlatformInfo).mockResolvedValue({
        arch: "x86-64",
        os: "linux",
    })
    jest.mocked(Native.nativegate).mockResolvedValue(true)
    jest.mocked(browser.runtime.sendNativeMessage).mockResolvedValue({
        version: "0.5.0",
    })
    const disconnect = jest.mocked(Native.disconnectNativeControls).mockClear()
    const reconnect = jest.mocked(Native.reconnectNativeControls).mockClear()
    const runAsync = jest.mocked(Native.runAsync).mockResolvedValue()

    await backgroundExcmds.updatenative(false)

    expect(disconnect).toHaveBeenCalledTimes(1)
    expect(runAsync).toHaveBeenCalledTimes(1)
    expect(disconnect.mock.invocationCallOrder[0]).toBeLessThan(
        runAsync.mock.invocationCallOrder[0],
    )
    expect(reconnect).not.toHaveBeenCalled()
})

test.each(["mktridactylrc", "source"])(
    "`%s` rejects without native",
    async command => {
        jest.mocked(Native.nativegate).mockResolvedValue(false)

        await expect(backgroundExcmds[command]()).rejects.toThrow(
            new RegExp(`:nativeinstall.*:${command} --clipboard`),
        )
    },
)

test.each([
    ["guiset_quiet", ["gui", "none"], "0.1.1"],
    ["exclaim_quiet", [], "0"],
    ["source_quiet", [], "0.1.3"],
])("`%s` suppresses missing-native errors", async (command, args, version) => {
    jest.mocked(Native.nativegate).mockClear().mockResolvedValue(false)

    await backgroundExcmds[command](...args)
    expect(Native.nativegate).toHaveBeenCalledWith(version, false)
})

test.each(["mktridactylrc", "source"])(
    "`%s --clipboard` does not require native",
    async command => {
        jest.mocked(Native.nativegate).mockClear()
        Object.assign(navigator, {
            clipboard: { readText: jest.fn(), writeText: jest.fn() },
        })

        await backgroundExcmds[command]("--clipboard")

        expect(Native.nativegate).not.toHaveBeenCalled()
    },
)

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

test("`unbind` bulk flags select prefixes, bindings and modes", async () => {
    const getAsync = jest.spyOn(config, "getAsync").mockResolvedValue(undefined)
    await config.set("nmaps", "z", "nop")
    await config.set("nmaps", "zz", "nop")
    await backgroundExcmds.bind("x", "tabdiscard", "--all")
    await config.set("imaps", "z", "nop")
    await unbind("--recursive", "--mode=normal", "z")
    const maps = config.get("nmaps")
    expect([maps.z, maps.zz]).toEqual([undefined, undefined])
    expect(maps.x).toBe("tabdiscard --all")
    expect(config.get("imaps", "z")).toBe("nop")
    jest.mocked(browser.commands.getAll).mockResolvedValue([
        { name: "command_1", shortcut: "Ctrl+6" },
    ])
    await config.set("nmaps", "z", "nop")
    await unbind("--recursive", "--mode=*", "z")
    expect(config.get("nmaps").z).toBeUndefined()
    expect(config.get("imaps").z).toBeUndefined()
    await unbind("--all", "--mode=*")
    expect(Object.keys(config.get("nmaps"))).toHaveLength(0)
    expect(browser.commands.update).toHaveBeenCalled()
    getAsync.mockRestore()
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

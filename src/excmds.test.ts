import { queryAndURLwrangler } from "@src/lib/webext"
import * as config from "@src/lib/config"

jest.mock("@src/lib/webext", () => ({
    ...jest.requireActual("@src/lib/webext"),
    activeTabId: jest.fn().mockResolvedValue(1),
    openInNewTab: jest.fn(),
    activeTabContainerId: jest.fn(),
    queryAndURLwrangler: jest.fn(),
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
Object.defineProperty(browser, "windows", {
    value: {
        create: jest.fn().mockResolvedValue({ tabs: [{ id: 42 }] }),
        getCurrent: jest.fn().mockReturnValue({ incognito: false }),
    },
})
Object.defineProperty(browser, "sessions", {
    value: { getTabValue: jest.fn(), setTabValue: jest.fn() },
})

const { set, tabopen, winopen } = require("@src/.excmds_background.generated")
const { ttscontrol } = require("@src/.excmds_content.generated")

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

test("`winopen` creates a neutral tab before navigating it", async () => {
    await winopen("https://example.com/")

    expect(browser.windows.create).toHaveBeenCalledWith({ url: "about:blank" })
    expect(browser.tabs.update).toHaveBeenCalledWith(42, {
        loadReplace: true,
        url: "https://example.com/",
    })
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

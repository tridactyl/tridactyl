import { queryAndURLwrangler } from "@src/lib/webext"
import * as config from "@src/lib/config"

jest.mock("@src/lib/webext", () => ({
    ...jest.requireActual("@src/lib/webext"),
    openInNewTab: jest.fn(),
    activeTabContainerId: jest.fn(),
    queryAndURLwrangler: jest.fn(),
}))

jest.mock("@src/lib/containers", () => ({
    ...jest.requireActual("@src/lib/containers"),
    fuzzyMatch: jest.fn().mockReturnValue("firefox-container-111"),
}))

// Missing from jest-webextension-mock.
const tabEvent = { addListener: jest.fn() }
Object.assign(browser.tabs, {
    onDetached: tabEvent,
    onAttached: tabEvent,
    onActivated: tabEvent,
})
Object.defineProperty(browser, "windows", {
    value: { getCurrent: jest.fn().mockReturnValue({ incognito: false }) },
})

const { set, tabopen } = require("@src/.excmds_background.generated")

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

import { queryAndURLwrangler } from "@src/lib/webext"

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

const { tabopen } = require("@src/.excmds_background.generated")

test.each(["none", "somecnt"])(
    '`tabopen("-c", "%s")` strips container arguments before URL handling',
    async container => {
        await tabopen("-c", container)

        expect(queryAndURLwrangler).toHaveBeenLastCalledWith([])
    },
)

import { tabopen } from "@src/.excmds_background.generated"
import { openInNewTab, getContext } from "@src/lib/webext"
import { fuzzyMatch } from "@src/lib/containers"

jest.mock("@src/lib/webext", () => {
    return {
        __esModule: true,
        openInNewTab: jest.fn(() => ({ then: fn => {} })),
        getContext: jest.fn(),
        activeTabContainerId: jest.fn(() => ({ then: fn => fn() })),
    }
})

jest.mock("@src/lib/containers", () => {
    return {
        __esModule: true,
        fuzzyMatch: jest.fn().mockReturnValue("firefox-container-111"),
    }
})

// Ideally this mock should be provided by jest-webextension-mock,
// but it isn't: https://github.com/clarkbw/jest-webextension-mock/issues/89
const windows = {
    getCurrent: jest.fn().mockReturnValue({ incognito: false }),
}

describe("excmds unit tests", () => {
    beforeAll(() => {
        Object.defineProperty(browser, "windows", { value: windows })
    })

    it('`tabopen("-c", "none")` opens tab with no container', async () => {
        await tabopen("-c", "none")

        expect(openInNewTab).toHaveBeenCalledWith(null, {})
    })

    it('`tabopen("-c", "somecnt")` opens tab with some container', async () => {
        await tabopen("-c", "somecnt")

        expect(openInNewTab).toHaveBeenCalledWith(null, {
            cookieStoreId: "firefox-container-111",
        })
    })
})

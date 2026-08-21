jest.mock("@src/lib/browser_proxy", () => ({
    __esModule: true,
    default: {},
    compatProxy: { sessions: {} },
    desktopProxy: jest.fn(),
    firefoxDesktopProxy: jest.fn(),
    firefoxProxy: jest.fn(),
    hasCapability: jest.fn(),
}))

import * as compat from "@src/lib/compat"
import * as config from "@src/lib/config"
import { compatProxy } from "@src/lib/browser_proxy"
import {
    activeTabContainerId,
    openInNewTab,
    queryAndURLwrangler,
    sessionsBg,
} from "@src/lib/webext"

describe("Android search fallback", () => {
    beforeEach(() => {
        jest.spyOn(compat, "isAndroid").mockResolvedValue(true)
    })

    afterEach(() => jest.restoreAllMocks())

    test("uses the configured default search URL without the search API", async () => {
        const values = {
            jsurls: {},
            searchengine: "",
            searchurls: { google: "https://www.google.com/search?q=" },
        }
        jest
            .spyOn(config, "get")
            .mockImplementation(key => values[key as keyof typeof values])

        await expect(queryAndURLwrangler(["lost", "query"])).resolves.toBe(
            "https://www.google.com/search?q=lost%20query",
        )
    })

    test("reports a missing URL fallback instead of discarding the query", async () => {
        const values = { jsurls: {}, searchengine: "", searchurls: {} }
        jest
            .spyOn(config, "get")
            .mockImplementation(key => values[key as keyof typeof values])

        await expect(queryAndURLwrangler(["lost", "query"])).rejects.toThrow(
            "searchengine",
        )
    })

    test("opens ordinary Android tabs without requiring containers", async () => {
        ;(browser.tabs.query as jest.Mock).mockResolvedValue([
            { id: 1, index: 0, windowId: 1 },
        ])
        ;(browser.tabs.create as jest.Mock).mockResolvedValue({ id: 2 })
        jest.spyOn(config, "get").mockReturnValue("next" as never)

        await expect(activeTabContainerId()).resolves.toBeUndefined()
        await expect(
            openInNewTab("https://example.com", { active: false }),
        ).resolves.toEqual({ id: 2 })
    })

    test("rejects unsupported Android tab creation options", async () => {
        ;(browser.tabs.query as jest.Mock).mockResolvedValue([
            { id: 1, index: 0, windowId: 1 },
        ])
        jest.spyOn(config, "get").mockReturnValue("next" as never)

        await expect(
            openInNewTab("https://example.com", {
                active: false,
                discarded: true,
            }),
        ).rejects.toThrow("unavailable on Android")
    })

    test("uses the background proxy for extension-page session state", () => {
        expect(sessionsBg).toBe(compatProxy.sessions)
    })
})

describe("portable search handling", () => {
    beforeEach(() => {
        jest.spyOn(compat, "isAndroid").mockResolvedValue(false)
        jest.spyOn(compat, "getFirefox").mockReturnValue({ kind: "unavailable" })
        jest.spyOn(compat.search, "get").mockResolvedValue([])
    })

    afterEach(() => jest.restoreAllMocks())

    test("recognizes a bare host without Firefox search APIs", async () => {
        const values = { jsurls: {}, searchengine: "", searchurls: {} }
        jest
            .spyOn(config, "get")
            .mockImplementation(key => values[key as keyof typeof values])

        await expect(queryAndURLwrangler(["example.com"])).resolves.toBe(
            "http://example.com/",
        )
    })

    test("prefers a search-engine alias that looks like a host", async () => {
        jest.spyOn(compat.search, "get").mockResolvedValue([
            { alias: "docs.example", name: "Documentation" },
        ] as browser.search.SearchEngine[])
        const values = { jsurls: {}, searchengine: "", searchurls: {} }
        jest
            .spyOn(config, "get")
            .mockImplementation(key => values[key as keyof typeof values])

        await expect(
            queryAndURLwrangler(["docs.example", "query"]),
        ).resolves.toEqual({ engine: "Documentation", query: "query" })
    })

    test("uses a configured search URL without Firefox search APIs", async () => {
        const values = {
            jsurls: {},
            searchengine: "google",
            searchurls: { google: "https://www.google.com/search?q=" },
        }
        jest
            .spyOn(config, "get")
            .mockImplementation(key => values[key as keyof typeof values])

        await expect(queryAndURLwrangler(["lost", "query"])).resolves.toBe(
            "https://www.google.com/search?q=lost%20query",
        )
    })

    test("opens ordinary desktop tabs without Firefox capabilities", async () => {
        const create = jest.fn().mockResolvedValue({ id: 2, windowId: 1 })
        jest.spyOn(compat, "getDesktop").mockResolvedValue({
            kind: "desktop",
            api: { tabs: { create } } as unknown as compat.DesktopApis,
        })
        const firefoxDesktop = jest.spyOn(compat, "getFirefoxDesktop")
        ;(browser.tabs.query as jest.Mock).mockResolvedValue([
            { id: 1, index: 0, windowId: 1 },
        ])
        jest.spyOn(config, "get").mockReturnValue("next" as never)

        await openInNewTab("https://example.com", { active: false })

        expect(create).toHaveBeenCalledWith(
            expect.objectContaining({ url: "https://example.com", index: 1 }),
        )
        expect(firefoxDesktop).not.toHaveBeenCalled()
    })
})

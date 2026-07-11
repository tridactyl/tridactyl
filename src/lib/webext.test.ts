jest.mock("@src/lib/browser_proxy", () => ({ __esModule: true, default: {} }))

import * as compat from "@src/lib/compat"
import * as config from "@src/lib/config"
import { queryAndURLwrangler } from "@src/lib/webext"

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
})

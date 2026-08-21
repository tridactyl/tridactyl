jest.mock("@src/lib/compat", () => ({
    sessions: { getTabValue: jest.fn() },
}))
jest.mock("@src/lib/messaging")

import * as compat from "@src/lib/compat"
import browserProxy from "@src/lib/browser_proxy"
import { shim } from "@src/lib/browser_proxy_background"
import { message } from "@src/lib/messaging"

test("browser proxy forwards compatibility API calls", () => {
    browserProxy.find.find("query")
    expect(message).toHaveBeenCalledWith(
        "browser_proxy_background",
        "shim",
        "find",
        "find",
        ["query"],
    )
})

test("browser proxy dispatches through compatibility implementations", async () => {
    const getTabValue = compat.sessions.getTabValue as jest.Mock
    getTabValue.mockResolvedValue("history")

    await expect(shim("sessions", "getTabValue", [3, "history"])).resolves.toBe(
        "history",
    )
    expect(getTabValue).toHaveBeenCalledWith(3, "history")
})

test("browser proxy falls back to unwrapped browser APIs", async () => {
    const query = browser.tabs.query as jest.Mock
    query.mockResolvedValue([{ id: 3 }])

    await expect(shim("tabs", "query", [{ active: true }])).resolves.toEqual([
        { id: 3 },
    ])
    expect(query).toHaveBeenCalledWith({ active: true })
})

jest.mock("@src/lib/compat", () => ({
    sessions: { getTabValue: jest.fn() },
}))

import * as compat from "@src/lib/compat"
import { shim } from "@src/lib/browser_proxy_background"

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

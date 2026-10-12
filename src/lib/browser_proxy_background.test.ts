jest.mock("@src/lib/compat", () => ({
    callProxy: jest.fn(),
    getDesktop: jest.fn(),
    getFirefox: jest.fn(),
    getFirefoxDesktop: jest.fn(),
    requireDesktop: jest.fn(),
    requireFirefox: jest.fn(),
    requireFirefoxDesktop: jest.fn(),
}))
jest.mock("@src/lib/messaging")

import * as compat from "@src/lib/compat"
import {
    compatProxy,
    desktopProxy,
    firefoxDesktopProxy,
    firefoxProxy,
    hasCapability as proxyHasCapability,
} from "@src/lib/browser_proxy"
import {
    hasCapability,
    shim,
} from "@src/lib/browser_proxy_background"
import { message } from "@src/lib/messaging"

test("browser proxy forwards compatibility API calls", () => {
    compatProxy.sessions.getTabValue(3, "history")
    expect(message).toHaveBeenCalledWith(
        "browser_proxy_background",
        "shim",
        "compat",
        "sessions",
        "getTabValue",
        [3, "history"],
    )
})

test("browser proxy dispatches through compatibility implementations", async () => {
    ;(compat.callProxy as jest.Mock).mockResolvedValue("history")

    await expect(
        shim("compat", "sessions", "getTabValue", [3, "history"]),
    ).resolves.toBe("history")
    expect(compat.callProxy).toHaveBeenCalledWith("sessions", "getTabValue", [
        3,
        "history",
    ])
})

test("capability proxies are enforced in the background", async () => {
    const find = jest.fn().mockResolvedValue({ count: 1 })
    ;(compat.requireFirefox as jest.Mock).mockReturnValue({ find: { find } })

    firefoxProxy().find.find("query")
    expect(message).toHaveBeenCalledWith(
        "browser_proxy_background",
        "shim",
        "firefox",
        "find",
        "find",
        ["query"],
    )
    await expect(shim("firefox", "find", "find", ["query"])).resolves.toEqual({
        count: 1,
    })
})

test("async capability routes are enforced in the background", async () => {
    const update = jest.fn().mockResolvedValue({ id: 3 })
    ;(compat.requireDesktop as jest.Mock).mockResolvedValue({ tabs: { update } })
    ;(compat.requireFirefoxDesktop as jest.Mock).mockResolvedValue({
        tabs: { update },
    })

    desktopProxy().tabs.update(3, { pinned: true })
    firefoxDesktopProxy().tabs.update(3, { loadReplace: true })
    expect(message).toHaveBeenCalledWith(
        "browser_proxy_background",
        "shim",
        "desktop",
        "tabs",
        "update",
        [3, { pinned: true }],
    )
    expect(message).toHaveBeenCalledWith(
        "browser_proxy_background",
        "shim",
        "firefoxDesktop",
        "tabs",
        "update",
        [3, { loadReplace: true }],
    )
    await expect(shim("desktop", "tabs", "update", [3, {}])).resolves.toEqual({
        id: 3,
    })
    await expect(
        shim("firefoxDesktop", "tabs", "update", [3, {}]),
    ).resolves.toEqual({ id: 3 })
})

test("capability checks run in the background", async () => {
    ;(compat.getDesktop as jest.Mock).mockResolvedValue({ kind: "desktop" })
    proxyHasCapability("desktop")
    expect(message).toHaveBeenCalledWith(
        "browser_proxy_background",
        "hasCapability",
        "desktop",
    )
    await expect(hasCapability("desktop")).resolves.toBe(true)
})

test("browser proxy falls back to unwrapped browser APIs", async () => {
    const query = browser.tabs.query as jest.Mock
    query.mockResolvedValue([{ id: 3 }])

    await expect(
        shim("browser", "tabs", "query", [{ active: true }]),
    ).resolves.toEqual([{ id: 3 }])
    expect(query).toHaveBeenCalledWith({ active: true })
})

test("compatibility proxy does not fall through to raw APIs", () => {
    ;(compat.callProxy as jest.Mock).mockImplementation(() => {
        throw new Error("Missing compatibility implementation: tabs.query")
    })
    expect(() => shim("compat", "tabs", "query", [])).toThrow(
        "Missing compatibility implementation: tabs.query",
    )
})

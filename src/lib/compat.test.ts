describe("platform detection", () => {
    let getPlatformInfo: jest.Mock
    beforeEach(() => {
        jest.resetModules()
        getPlatformInfo = jest.fn()
        Object.defineProperty(browser.runtime, "getPlatformInfo", {
            configurable: true,
            value: getPlatformInfo,
        })
        Object.defineProperty(browser.runtime, "getBrowserInfo", {
            configurable: true,
            value: undefined,
        })
    })

    test("is lazy and shares one in-flight request", async () => {
        let resolvePlatformInfo: (info: any) => void = () => undefined
        getPlatformInfo.mockReturnValue(
            new Promise(resolve => {
                resolvePlatformInfo = resolve
            }),
        )
        const { isAndroid } = require("./compat") as typeof import("./compat")

        expect(getPlatformInfo).not.toHaveBeenCalled()
        const first = isAndroid()
        expect(isAndroid()).toBe(first)
        expect(getPlatformInfo).toHaveBeenCalledTimes(1)
        resolvePlatformInfo({ os: "linux" })
        await expect(first).resolves.toBe(false)
    })

    test("async wrappers wait for authoritative platform info", async () => {
        let resolvePlatformInfo: (info: any) => void = () => undefined
        getPlatformInfo.mockReturnValue(
            new Promise(resolve => {
                resolvePlatformInfo = resolve
            }),
        )
        const getTree = jest.fn().mockResolvedValue([])
        Object.defineProperty(browser, "bookmarks", {
            configurable: true,
            value: { getTree },
        })
        const compat = require("./compat") as typeof import("./compat")

        const value = compat.bookmarks.getTree()
        expect(getTree).not.toHaveBeenCalled()
        resolvePlatformInfo({ os: "linux" })
        await expect(value).resolves.toEqual([])
        expect(getTree).toHaveBeenCalledTimes(1)
    })

    test("retries after platform detection fails", async () => {
        getPlatformInfo
            .mockRejectedValueOnce(new Error("platform unavailable"))
            .mockResolvedValueOnce({ os: "android" })
        const { isAndroid } = require("./compat") as typeof import("./compat")

        await expect(isAndroid()).rejects.toThrow("platform unavailable")
        await expect(isAndroid()).resolves.toBe(true)
        expect(getPlatformInfo).toHaveBeenCalledTimes(2)
    })

    test("exposes Firefox desktop APIs through an explicit capability", async () => {
        getPlatformInfo.mockResolvedValue({ os: "linux" })
        Object.defineProperty(browser.runtime, "getBrowserInfo", {
            configurable: true,
            value: jest.fn(),
        })
        const compat = require("./compat") as typeof import("./compat")

        await expect(compat.getFirefoxDesktop()).resolves.toMatchObject({
            kind: "firefoxDesktop",
            api: { tabs: { hide: compat.tabs.hide } },
        })
        expect(compat.getFirefox()).toMatchObject({
            kind: "firefox",
            api: { find: { find: compat.find.find } },
        })
    })

    test("exposes cross-browser desktop APIs independently", async () => {
        getPlatformInfo.mockResolvedValue({ os: "linux" })
        const compat = require("./compat") as typeof import("./compat")

        await expect(compat.getDesktop()).resolves.toMatchObject({
            kind: "desktop",
            api: { windows: { getCurrent: compat.windows.getCurrent } },
        })
    })

    test("rejects explicit Firefox desktop operations elsewhere", async () => {
        getPlatformInfo.mockResolvedValue({ os: "android" })
        const compat = require("./compat") as typeof import("./compat")

        await expect(compat.getFirefoxDesktop()).resolves.toEqual({
            kind: "unavailable",
        })
        await expect(compat.requireFirefoxDesktop()).rejects.toThrow(
            "requires Firefox desktop",
        )
        await expect(compat.requireDesktop()).rejects.toThrow(
            "requires a desktop browser",
        )
    })

    test("does not mistake another desktop browser for Firefox", async () => {
        getPlatformInfo.mockResolvedValue({ os: "linux" })
        const compat = require("./compat") as typeof import("./compat")

        expect(compat.getFirefox()).toEqual({ kind: "unavailable" })
        await expect(compat.getFirefoxDesktop()).resolves.toEqual({
            kind: "unavailable",
        })
    })

    test("event registration and sidebar calls remain synchronous", async () => {
        jest.resetModules()
        const addListener = jest.fn()
        const open = jest.fn().mockResolvedValue(undefined)
        Object.defineProperty(browser.commands, "onCommand", {
            configurable: true,
            value: { addListener },
        })
        Object.defineProperty(browser, "sidebarAction", {
            configurable: true,
            value: { open },
        })
        const compat = require("./compat") as typeof import("./compat")

        expect(compat.commands.onCommand.addListener(jest.fn())).toBeUndefined()
        const sidebar = compat.getSidebar()
        expect(sidebar.kind).toBe("sidebar")
        if (sidebar.kind === "unavailable") throw new Error("missing sidebar")
        const opened = sidebar.api.open()
        expect(addListener).toHaveBeenCalledTimes(1)
        expect(open).toHaveBeenCalledTimes(1)
        await expect(opened).resolves.toBeUndefined()
    })

    test("unavailable APIs are not accessed", async () => {
        jest.resetModules()
        Object.defineProperty(browser.commands, "onCommand", {
            configurable: true,
            value: undefined,
        })
        Object.defineProperty(browser, "sidebarAction", {
            configurable: true,
            value: undefined,
        })
        Object.defineProperty(browser, "downloads", {
            configurable: true,
            value: undefined,
        })
        Object.defineProperty(browser, "topSites", {
            configurable: true,
            value: undefined,
        })
        jest.spyOn(console, "warn").mockImplementation()
        const compat = require("./compat") as typeof import("./compat")

        expect(compat.commands.onCommand.addListener(jest.fn())).toBeUndefined()
        expect(compat.getSidebar()).toEqual({ kind: "unavailable" })
        await expect(compat.sidebarAction.open()).rejects.toThrow(
            "sidebarAction.open is not supported",
        )
        await expect(
            compat.downloads.download({ url: "https://example.com" }),
        ).rejects.toThrow("downloads.download is not supported")
        await expect(compat.topSites.get()).resolves.toEqual([])
        expect(console.warn).toHaveBeenCalledTimes(1)
    })

    test("proxy dispatch exposes only background-safe fallbacks", () => {
        const compat = require("./compat") as typeof import("./compat")

        expect(() => compat.callProxy("tabs", "query", [])).toThrow(
            "Missing compatibility implementation",
        )
    })

    test("stores session values in memory on Android", async () => {
        getPlatformInfo.mockResolvedValue({ os: "android" })
        const compat = require("./compat") as typeof import("./compat")
        const { sessions } = compat

        await sessions.setTabValue(3, "history", { list: [1] })
        await sessions.setWindowValue(4, "groups", ["work"])
        await expect(sessions.getTabValue(3, "history")).resolves.toEqual({
            list: [1],
        })
        await expect(sessions.getWindowValue(4, "groups")).resolves.toEqual([
            "work",
        ])
        await sessions.removeTabValue(3, "history")
        await sessions.removeWindowValue(4, "groups")
        await expect(sessions.getTabValue(3, "history")).resolves.toBeUndefined()
        await expect(sessions.getWindowValue(4, "groups")).resolves.toBeUndefined()

        await sessions.setTabValue(3, "history", { list: [1] })
        await sessions.setWindowValue(4, "groups", ["work"])
        compat.clearTabSessionValues(3)
        compat.clearWindowSessionValues(4)
        await expect(sessions.getTabValue(3, "history")).resolves.toBeUndefined()
        await expect(sessions.getWindowValue(4, "groups")).resolves.toBeUndefined()
    })

    test("stores session values when native methods are unavailable", async () => {
        getPlatformInfo.mockResolvedValue({ os: "linux" })
        Object.defineProperty(browser, "sessions", {
            configurable: true,
            value: {},
        })
        const { sessions } = require("./compat") as typeof import("./compat")

        await sessions.setTabValue(3, "history", [1])
        await expect(sessions.getTabValue(3, "history")).resolves.toEqual([1])
    })

    test("forwards session values on supported platforms", async () => {
        getPlatformInfo.mockResolvedValue({ os: "linux" })
        const getTabValue = jest.fn().mockResolvedValue("history")
        Object.defineProperty(browser, "sessions", {
            configurable: true,
            value: { getTabValue },
        })
        const compat = require("./compat") as typeof import("./compat")
        await compat.isAndroid()
        const { sessions } = compat

        await expect(sessions.getTabValue(3, "history")).resolves.toBe("history")
        expect(getTabValue).toHaveBeenCalledWith(3, "history")
    })

    test("returns an empty find result on Android", async () => {
        getPlatformInfo.mockResolvedValue({ os: "android" })
        const compat = require("./compat") as typeof import("./compat")

        await expect(compat.find.find("query")).resolves.toEqual({
            count: 0,
            rangeData: [],
        })
    })

    test("rejects unsupported mutations on Android", async () => {
        getPlatformInfo.mockResolvedValue({ os: "android" })
        const compat = require("./compat") as typeof import("./compat")

        await expect(compat.tabs.hide([1])).rejects.toThrow(
            "tabs.hide is not supported",
        )
    })

    test("forwards mutation arguments and results", async () => {
        getPlatformInfo.mockResolvedValue({ os: "linux" })
        const hide = jest.fn().mockResolvedValue([1])
        Object.defineProperty(browser.tabs, "hide", {
            configurable: true,
            value: hide,
        })
        const compat = require("./compat") as typeof import("./compat")
        await compat.isAndroid()

        await expect(compat.tabs.hide([1])).resolves.toEqual([1])
        expect(hide).toHaveBeenCalledWith([1])
    })
})

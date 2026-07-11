describe("platform detection", () => {
    let getPlatformInfo: jest.Mock
    beforeEach(() => {
        jest.resetModules()
        getPlatformInfo = jest.fn()
        Object.defineProperty(browser.runtime, "getPlatformInfo", {
            configurable: true,
            value: getPlatformInfo,
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
        const getTabValue = jest.fn().mockResolvedValue("desktop")
        Object.defineProperty(browser, "sessions", {
            configurable: true,
            value: { getTabValue },
        })
        const compat = require("./compat") as typeof import("./compat")

        const value = compat.sessions.getTabValue(3, "history")
        expect(getTabValue).not.toHaveBeenCalled()
        resolvePlatformInfo({ os: "linux" })
        await expect(value).resolves.toBe("desktop")
        expect(getTabValue).toHaveBeenCalledWith(3, "history")
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
        const opened = compat.sidebarAction.open()
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
        await expect(compat.sidebarAction.open()).rejects.toThrow(
            "sidebarAction.open is not supported",
        )
        await expect(
            compat.downloads.download({ url: "https://example.com" }),
        ).rejects.toThrow("downloads.download is not supported")
        await expect(compat.topSites.get()).resolves.toEqual([])
        expect(console.warn).toHaveBeenCalledTimes(1)
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

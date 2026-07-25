import * as config from "@src/lib/config"
import { getState, init, toggle } from "@src/background/browser_action"

jest.mock("@src/lib/config", () => {
    const userconfig = { superignore: "false" }
    return {
        DEFAULTS: { superignore: "false" },
        USERCONFIG: userconfig,
        getAsync: jest.fn().mockResolvedValue(undefined),
        set: jest.fn((_key, value) => {
            userconfig.superignore = value
            return Promise.resolve()
        }),
        addChangeListener: jest.fn(),
    }
})

test("browser action toggles superignore without reloading tabs", async () => {
    await config.set("superignore", "false")

    init()
    await expect(getState()).resolves.toBe("false")
    await expect(Promise.all([toggle(), toggle()])).resolves.toEqual([
        "true",
        "false",
    ])
    expect(config.USERCONFIG.superignore).toBe("false")
    expect(browser.browserAction.setBadgeText).toHaveBeenCalledWith({
        text: "OFF",
    })
    expect(browser.tabs.reload).not.toHaveBeenCalled()
    expect(browser.browserAction.onClicked.addListener).not.toHaveBeenCalled()
    expect(browser.browserAction.setTitle).toHaveBeenLastCalledWith({
        title: "Tridactyl enabled",
    })

    jest.mocked(config.set).mockImplementationOnce(async (_key, value) => {
        config.USERCONFIG.superignore = value as "true" | "false"
        throw new Error("write failed")
    })
    await expect(toggle()).rejects.toThrow("write failed")
    expect(config.USERCONFIG.superignore).toBe("false")
})

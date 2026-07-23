import * as controller from "@src/lib/controller"
import * as config from "@src/lib/config"
import { runRc } from "@src/background/config_rc"

jest.mock("@src/lib/controller")
global.structuredClone ??= value => JSON.parse(JSON.stringify(value))

test("runRc updates and saves versioned config", async () => {
    await config.clear()
    jest.mocked(controller.acceptExCmd).mockImplementation(async cmd => {
        const [, key, value] = cmd.split(" ")
        await config.set(key, value)
    })

    await runRc("set configversion 1.0\nset vimium-gi false")

    expect(browser.storage.local.set).toHaveBeenLastCalledWith(
        expect.objectContaining({
            userconfig: expect.objectContaining({
                configversion: "2.0",
                gimode: "firefox",
            }),
        }),
    )
})

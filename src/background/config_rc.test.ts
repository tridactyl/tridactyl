import * as controller from "@src/lib/controller"
import * as config from "@src/lib/config"
import { rcFileToExCmds, runRc } from "@src/background/config_rc"

jest.mock("@src/lib/controller")
global.structuredClone ??= value => JSON.parse(JSON.stringify(value))

const backslash = "\\"
test.each([
    [`set foo one ${backslash}\ntwo`, ["set foo one two"]],
    [
        `keymap foo ${backslash}${backslash}\nset bar baz`,
        [`keymap foo ${backslash}`, "set bar baz"],
    ],
    [`keymap foo ${backslash}${backslash}\n`, [`keymap foo ${backslash}`]],
    [`keymap foo ${backslash}`, [`keymap foo ${backslash}`]],
])("parses RC line ending backslashes", (rc, expected) => {
    expect(rcFileToExCmds(rc)).toEqual(expected)
})

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

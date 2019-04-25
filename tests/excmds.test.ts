require("geckodriver")

const fs = require("fs")
const webdriver = require("selenium-webdriver")
const Options = require("selenium-webdriver/firefox").Options

jest.setTimeout(60000)

describe("webdriver", () => {
        let driver
        beforeAll(async () => {
                const dir = "web-ext-artifacts"
                const extensionName = "tridactyl.xpi"
                const extensionPath = dir + "/" + extensionName
                driver = new webdriver.Builder()
                        .forBrowser("firefox")
                        .setFirefoxOptions((new Options())
                                .setPreference("xpinstall.signatures.required", false)
                                .addExtensions(extensionPath))
                        .build()
                // Wait until addon is loaded and :tutor is displayed
                await driver.wait(webdriver.until.elementLocated(webdriver.By.id("cmdline_iframe")))
        })

        afterAll(async () => {
                try {
                        await driver.close()
                } catch(e) {}
                try {
                        await driver.quit()
                } catch(e) {}
        })

        test("Commandline is inserted into page.", async () => {
                await driver.get("about:blank")
                let elem = await driver.wait(webdriver.until.elementLocated(webdriver.By.id("cmdline_iframe")))
                expect((await elem.getAttribute('src')).startsWith("moz-extension://"))
                        .toEqual(true)
        })
})

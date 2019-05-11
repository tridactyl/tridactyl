require("geckodriver")

const fs = require("fs")
const webdriver = require("selenium-webdriver")
const Options = require("selenium-webdriver/firefox").Options

jest.setTimeout(60000)

// API docs because I waste too much time looking for them every time I go back to this:
// https://seleniumhq.github.io/selenium/docs/api/javascript/

const vimToSelenium = {
        "Down": webdriver.Key.ARROW_DOWN,
        "Left": webdriver.Key.ARROW_LEFT,
        "Right": webdriver.Key.ARROW_RIGHT,
        "Up": webdriver.Key.ARROW_UP,
        "BS": webdriver.Key.BACK_SPACE,
        "Del": webdriver.Key.DELETE,
        "End": webdriver.Key.END,
        "CR": webdriver.Key.ENTER,
        "Esc": webdriver.Key.ESCAPE,
        "Home": webdriver.Key.HOME,
        "PageDown": webdriver.Key.PAGE_DOWN,
        "PageUp": webdriver.Key.PAGE_UP,
        "Tab": webdriver.Key.TAB,
        "lt": "<",
}

const modToSelenium = {
        "A": webdriver.Key.ALT,
        "C": webdriver.Key.CONTROL,
        "M": webdriver.Key.META,
        "S": webdriver.Key.SHIFT,
}

function translateKeys(string) {
        return string.replace(/<([^>-]+)-?([^>]*)>/g, (wholematch, modifier, key, pos, str) => {
                // There only is a modifier if 'key' isn't empty (<Up> = no modifier)
                if (key.length > 0) {
                        return webdriver.Key.chord(
                                ...(modifier.split("").map(m => modToSelenium[m])),
                                (vimToSelenium[key] || key),
                                webdriver.Key.NULL,
                        )
                }
                return vimToSelenium[modifier] || modifier
        })
}

function sendKeys (driver, keys) {
        return translateKeys(keys).split("")
                .reduce((prom, key) => {
                        return prom.then(_ => driver.wait(driver.switchTo().activeElement()))
                                .then(elem => elem.sendKeys(key))
                                .then(_ => driver.sleep(5))
                }, Promise.resolve())
}

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
                // And wait a bit more otherwise Tridactyl won't be happy
                await driver.sleep(1000)
        })

        afterAll(async () => {
                try {
                        await driver.close()
                } catch(e) {}
                try {
                        await driver.quit()
                } catch(e) {}
        })

        async function newTabWithoutChangingOldTabs (callback) {
                const tabsBefore = await driver.executeScript("return tri.browserBg.tabs.query({})")
                const result = await callback(tabsBefore);
                const tabsAfter = await driver.executeScript("return tri.browserBg.tabs.query({})")
                // A single new tab has been created
                expect(tabsAfter.length).toBe(tabsBefore.length + 1)

                // None of the previous tabs changed, except maybe for their index
                const newtab = tabsAfter.find(tab2 => !tabsBefore.find(tab => tab.id == tab2.id))
                const notNewTabs = tabsAfter.slice()
                notNewTabs.splice(tabsAfter.findIndex(tab => tab == newtab), 1)
                const ignoreValues = {
                        active: false, // the previously-active tab isn't active anymore
                        highlighted: true, // changing tabs changes highlights
                        index: 0, // indexes might not be the same depending on whether the new tab is
                        lastAccessed: 0, // lastAccessed has also changed for the previously-active tab
                }
                for (let i = 0; i < tabsBefore.length; ++i) {
                        let copy1 = Object.assign({}, tabsBefore[i], ignoreValues)
                        let copy2 = Object.assign({}, notNewTabs[i], ignoreValues)
                        expect(copy1).toEqual(copy2)
                }
                return [newtab, result]
        }

        test("`:tabopen<CR>` opens the newtab page.", async () => {
                return newTabWithoutChangingOldTabs(async () => {
                        await sendKeys(driver, ":tabopen<CR>")
                        await driver.sleep(500)
                }).then(([newtab, _]) => {
                        // The new tab is active
                        expect(newtab.active).toEqual(true)
                        // Its url is the newtab page's url
                        expect(newtab.url).toMatch(new RegExp("moz-extension://.*/static/newtab.html"))
                })
        })

        test("`:tabopen https://example.org<CR>` opens example.org.", async () => {
                return newTabWithoutChangingOldTabs(async () => {
                        await sendKeys(driver, ":tabopen https://example.org<CR>")
                        await driver.sleep(500)
                }).then(([newtab, _]) => {
                        // The new tab is active
                        expect(newtab.active).toEqual(true)
                        // Its url is example.org
                        expect(newtab.url).toMatch("https://example.org")
                })
        })
})

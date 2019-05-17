require("geckodriver")

const fs = require("fs")
const webdriver = require("selenium-webdriver")
const Options = require("selenium-webdriver/firefox").Options

jest.setTimeout(20000)

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
                                .then(_ => driver.sleep(10))
                }, Promise.resolve())
}

describe("webdriver", () => {
        async function getDriver() {
                const dir = "web-ext-artifacts"
                const extensionName = "tridactyl.xpi"
                const extensionPath = dir + "/" + extensionName
                const driver = new webdriver.Builder()
                        .forBrowser("firefox")
                        .setFirefoxOptions((new Options())
                                .setPreference("xpinstall.signatures.required", false)
                                .addExtensions(extensionPath))
                        .build()
                // Wait until addon is loaded and :tutor is displayed
                await driver.wait(webdriver.until.elementLocated(webdriver.By.id("cmdline_iframe")))
                // And wait a bit more otherwise Tridactyl won't be happy
                await driver.sleep(500)
                return driver
        }

        async function killDriver(driver) {
                try {
                        await driver.close()
                } catch(e) {}
                try {
                        await driver.quit()
                } catch(e) {}
        }

        async function untilTabUrlMatches(driver, tabId, pattern) {
                let match
                do {
                        match = (await driver.executeScript(`return tri.browserBg.tabs.get(${tabId})`))
                                .url
                                .match(pattern)
                } while (!match)
                return match
        }

        async function newTabWithoutChangingOldTabs (driver, callback) {
                const tabsBefore = await driver.executeScript("return tri.browserBg.tabs.query({})")
                const result = await callback(tabsBefore);
                const tabsAfter = await driver.wait(async () => {
                        let tabsAfter
                        do {
                                tabsAfter = await driver.executeScript("return tri.browserBg.tabs.query({})")
                        } while (tabsAfter.length == tabsBefore.length)
                        return tabsAfter
                })
                // A single new tab has been created
                expect(tabsAfter.length).toBe(tabsBefore.length + 1)

                // None of the previous tabs changed, except maybe for their index
                const newtab = tabsAfter.find(tab2 => !tabsBefore.find(tab => tab.id == tab2.id))
                const notNewTabs = tabsAfter.slice()
                notNewTabs.splice(tabsAfter.findIndex(tab => tab == newtab), 1)
                const ignoreValues = {
                        active: false, // the previously-active tab isn't necessarily active anymore
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
                const driver = await getDriver()
                return newTabWithoutChangingOldTabs(driver, async (tabsBefore) => {
                        await sendKeys(driver, ":tabopen<CR>")
                }).then(async ([newtab, _]) => {
                        // The new tab is active
                        expect(newtab.active).toEqual(true)
                        // Its url is the newtab page's url
                        await driver.wait(untilTabUrlMatches(driver, newtab.id, new RegExp("moz-extension://.*/static/newtab.html")), 10000)
                }).finally(() => killDriver(driver))
        })

        test("`:tabopen https://example.org<CR>` opens example.org.", async () => {
                const driver = await getDriver()
                return newTabWithoutChangingOldTabs(driver, async () => {
                        await sendKeys(driver, ":tabopen https://example.org<CR>")
                }).then(async ([newtab, _]) => {
                        expect(newtab.active).toEqual(true)
                        await driver.wait(untilTabUrlMatches(driver, newtab.id, "https://example.org"), 10000)
                }).finally(() => killDriver(driver))
        })

        test("`:tabopen qwant https://example.org<CR>` opens qwant.", async () => {
                const driver = await getDriver()
                return newTabWithoutChangingOldTabs(driver, async () => {
                        await sendKeys(driver, ":tabopen qwant https://example.org<CR>")
                }).then(async ([newtab, _]) => {
                        expect(newtab.active).toEqual(true)
                        await driver.wait(untilTabUrlMatches(driver, newtab.id, new RegExp("^https://www.qwant.com/.*example.org")), 10000)
                }).finally(() => killDriver(driver))
        })

        test("`:tabopen test<CR>` opens google.", async () => {
                const driver = await getDriver()
                return newTabWithoutChangingOldTabs(driver, async () => {
                        await sendKeys(driver, ":tabopen test<CR>")
                }).then(async ([newtab, _]) => {
                        expect(newtab.active).toEqual(true)
                        await driver.wait(untilTabUrlMatches(driver, newtab.id, new RegExp("^https://www.google.com/.*test")), 10000)
                }).finally(() => killDriver(driver))
        })

        test("`:tabopen example.org<CR>` opens example.org.", async () => {
                const driver = await getDriver()
                return newTabWithoutChangingOldTabs(driver, async () => {
                        await sendKeys(driver, ":tabopen example.org<CR>")
                }).then(async ([newtab, _]) => {
                        expect(newtab.active).toEqual(true)
                        await driver.wait(untilTabUrlMatches(driver, newtab.id, "example.org"), 10000)
                }).finally(() => killDriver(driver))
        })

        test("`:tabopen search duckduckgo<CR>` opens google.", async () => {
                const driver = await getDriver()
                return newTabWithoutChangingOldTabs(driver, async () => {
                        await sendKeys(driver, ":tabopen search duckduckgo<CR>")
                }).then(async ([newtab, _]) => {
                        expect(newtab.active).toEqual(true)
                        await driver.wait(untilTabUrlMatches(driver, newtab.id, new RegExp("^https://www.google.com/search.*duckduckgo")), 10000)
                }).finally(() => killDriver(driver))
        })

        test("`:tabopen -b about:blank<CR>` opens a background tab.", async () => {
                const driver = await getDriver()
                return newTabWithoutChangingOldTabs(driver, async () => {
                        await sendKeys(driver, ":tabopen -b about:blank<CR>")
                }).then(async ([newtab, _]) => {
                        expect(newtab.active).toEqual(false)
                        await driver.wait(untilTabUrlMatches(driver, newtab.id, "about:blank"))
                }).finally(() => killDriver(driver))
        })

        test("`:tabopen -c work about:blank<CR>` opens about:blank in a container.", async () => {
                const driver = await getDriver()
                return newTabWithoutChangingOldTabs(driver, async () => {
                        await sendKeys(driver, ":tabopen -c work about:blank<CR>")
                }).then(async ([newtab, _]) => {
                        expect(newtab.active).toEqual(true)
                        expect(newtab.cookieStoreId).toMatch("firefox-container-")
                        await driver.wait(untilTabUrlMatches(driver, newtab.id, "about:blank"))
                }).finally(() => killDriver(driver))
        })

        test("`:tabopen -b -c work search qwant<CR>` opens about:blank in a container.", async () => {
                const driver = await getDriver()
                return newTabWithoutChangingOldTabs(driver, async () => {
                        await sendKeys(driver, ":tabopen -b -c work search qwant<CR>")
                }).then(async ([newtab, _]) => {
                        expect(newtab.active).toEqual(false)
                        expect(newtab.cookieStoreId).toMatch("firefox-container-")
                        await driver.wait(untilTabUrlMatches(driver, newtab.id, new RegExp("^https://www.google.com/search.*qwant")))
                }).finally(() => killDriver(driver))
        })
})

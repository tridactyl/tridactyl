import * as process from "process"
const env = process.env
import * as fs from "fs"
import * as os from "os"
import * as path from "path"
import { Browser, Builder, By } from "selenium-webdriver"
import { Options, Driver } from "selenium-webdriver/firefox"
import * as Until from "selenium-webdriver/lib/until"
import { getNewestFileIn, sendKeys } from "./utils";

jest.setTimeout(100000)

// API docs because I waste too much time looking for them every time I go back to this:
// https://seleniumhq.github.io/selenium/docs/api/javascript/


describe("webdriver", () => {

    function iframeLoaded(driver) {
        return driver.wait(Until.elementLocated(By.id("cmdline_iframe")))
    }
    
    let driver: Driver;
    beforeEach(async () => {
        driver = await getDriver();
    });

    afterEach(async () => {
        await killDriver(driver);
    });

    async function getDriver() {
        const extensionPath = await getNewestFileIn(path.resolve("web-ext-artifacts"))
        if (extensionPath === undefined) {
            throw new Error("Couldn't find extension path");
        }

        const options = (new Options())
        if (env["HEADLESS"]) {
            options.addArguments("--headless");
        }
        const driver= new Builder()
            .forBrowser(Browser.FIREFOX)
            .setFirefoxOptions(options)
            .build() as unknown as Driver
        await driver.installAddon(extensionPath, true)
        // Wait until addon is loaded and :tutor is displayed
        await iframeLoaded(driver)
        // And wait a bit more otherwise Tridactyl won't be happy
        await driver.sleep(500)
        return driver
    }

    async function getDriverAndProfileDirs() {
        const rootDir = os.tmpdir()
        // First, find out what profile the driver is using
        const profiles = fs.readdirSync(rootDir).map(p => path.join(rootDir, p))
        const driver = await getDriver()
        const newProfiles = fs.readdirSync(rootDir).map(p => path.join(rootDir, p))
            .filter(p => p.match("moz") && !profiles.includes(p))

        // Tridactyl's tmp profile detection is broken on windows and OSX
        if (["win32", "darwin"].includes(os.platform())) {
            await sendKeys(driver, `:set profiledir ${newProfiles[0]}<CR>`)
            await driver.sleep(1000)
        }

        return { driver, newProfiles }
    }

    async function killDriver(driver: Driver) {
        try {
            await driver.close()
        } catch(e) {}
        try {
            await driver.quit()
        } catch(e) {}
    }

    async function untilTabUrlMatches(driver: Driver, tabId: number, pattern: string | RegExp) {
        let match
        do {
            const result = await driver.executeScript(`return tri.browserBg.tabs.get(${tabId})`);
            if (typeof result === 'object' && result !== null && 'url' in result) {
                match = (result as { url: string }).url.match(pattern);
            } else {
                throw new Error('Unexpected result structure');
            }
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

    // A simple ternany doesn't work inline :(
    function testbutskipplatforms(...platforms){
        if (platforms.includes(os.platform())) {
            return test.skip
        }
        return test
    }


    test("`:rssexec` works", async () => {
        try {
            await sendKeys(driver, ":set rsscmd js "
                + "const elem=document.createElement('span');"
                + "elem.id='rsscmdExecuted';"
                + "elem.innerText=`%u`;"
                + "document.body.appendChild(elem)<CR>")

            // First, make sure completions are offered
            await driver.get("file:///" + process.cwd() + "/e2e_tests/html/rss.html")
            const iframe = await iframeLoaded(driver)
            await sendKeys(driver, ":rssexec ")
            await driver.switchTo().frame(iframe)
            const elements = await driver.findElements(By.className("RssCompletionOption"))
            expect(elements.length).toBeGreaterThan(3)
            const url = await elements[0].getAttribute("innerText")

            // Then, make sure rsscmd is executed and has the right arguments
            await sendKeys(driver, "<Tab><CR>")
            await (driver.switchTo() as any).parentFrame()
            const elem = await driver.wait(Until.elementLocated(By.id("rsscmdExecuted")))
            expect(url).toMatch(await elem.getAttribute("innerText"))
        } catch (e) {
            fail(e)
        }
    })

    test("`:editor` works", async () => {
        try {
            const addedText = "There are %l lines and %c characters in this textarea."

            if (os.platform() == "win32") {
                await sendKeys(driver, `:set editorcmd echo | set /p text="${addedText}" >> %f<CR>`)
            } else {
                await sendKeys(driver, `:set editorcmd /bin/echo -n '${addedText}' >> %f<CR>`)
            }

            const areaId = "editorTest"
            await driver.executeScript(`
                                const area = document.createElement("textarea")
                                area.id = "${areaId}"
                                document.body.appendChild(area)
                                area.focus()
                        `)
            const text = "This is a line\nThis is another\nThis is a third."
            await sendKeys(driver, text + "<C-i>")
            await driver.sleep(1000)
            expect(await driver.executeScript(`return document.getElementById("${areaId}").value`))
                .toEqual(text + addedText.replace("%l", "3").replace("%c", "" + text.split("\n")[2].length))
        } catch (e) {
            fail(e)
        }
    })

    testbutskipplatforms("darwin")("`:guiset` works", async () => {
            const { driver, newProfiles } = await getDriverAndProfileDirs()
            try {
                // Then, make sure `:guiset` is offering completions
                const iframe = await iframeLoaded(driver)
                await sendKeys(driver, ":guiset ")
                await driver.switchTo().frame(iframe)
                const elements = await driver.findElements(By.className("GuisetCompletionOption"))
                expect(elements.length).toBeGreaterThan(0)

                // Use whatever the first suggestion is
                await sendKeys(driver, "<Tab> <Tab><CR>")
                await driver.sleep(2000)
                expect(await driver.executeScript(`return document.getElementById("tridactyl-input").value`))
                .toEqual("userChrome.css written. Please restart Firefox to see the changes.")
                expect(newProfiles.find(p => fs
                                        .readdirSync(path.join(p, "chrome"))
                                        .find(files => files.match("userChrome.css$")))
                      ).toBeDefined()
            } catch (e) {
                fail(e)
            } finally {
                await killDriver(driver)
            }
    })

    test("`:colourscheme` works", async () => {
        try {
            expect(await driver.executeScript(`return document.documentElement.className`))
                .toMatch("TridactylOwnNamespace TridactylThemeDefault")
            await sendKeys(driver, ":colourscheme dark<CR>")
            await driver.sleep(100)
            expect(await driver.executeScript(`return document.documentElement.className`))
                .toMatch("TridactylOwnNamespace TridactylThemeDark")
        } catch (e) {
            fail(e)
        }
    })

    test("`:setpref` works", async () => {
        const { driver, newProfiles } = await getDriverAndProfileDirs()
        try {
            await sendKeys(driver, `:setpref a.b.c "d"<CR>`)
            await driver.sleep(2000)
            const file = fs.readFileSync(path.join(newProfiles[0], "user.js"), { encoding: "utf-8" })
            expect(file).toMatch(/user_pref\("a.b.c", "d"\);/)
        } catch (e) {
            fail(e)
        }
    })

    test("`:tabopen<CR>` opens the newtab page.", async () => {
        return newTabWithoutChangingOldTabs(driver, async (tabsBefore) => {
            await sendKeys(driver, ":tabopen<CR>")
        }).then(async ([newtab, _]) => {
            // The new tab is active
            expect(newtab.active).toEqual(true)
            // Its url is the newtab page's url
            await driver.wait(untilTabUrlMatches(driver, newtab.id, new RegExp("moz-extension://.*/static/newtab.html")), 10000)
        })
    })

    test("`:tabopen https://example.org<CR>` opens example.org.", async () => {
        return newTabWithoutChangingOldTabs(driver, async () => {
            await sendKeys(driver, ":tabopen https://example.org<CR>")
        }).then(async ([newtab, _]) => {
            expect(newtab.active).toEqual(true)
            await driver.wait(untilTabUrlMatches(driver, newtab.id, "https://example.org"), 10000)
        })
    })

    test("`:tabopen qwant https://example.org<CR>` opens qwant.", async () => {
        return newTabWithoutChangingOldTabs(driver, async () => {
            await sendKeys(driver, ":tabopen qwant https://example.org<CR>")
        }).then(async ([newtab, _]) => {
            expect(newtab.active).toEqual(true)
            await driver.wait(untilTabUrlMatches(driver, newtab.id, new RegExp("^https://www.qwant.com/.*example.org")), 10000)
        })
    })

//     test("`:tabopen test<CR>` opens google.", async () => {
//         const driver = await getDriver()
//         return newTabWithoutChangingOldTabs(driver, async () => {
//             await sendKeys(driver, ":tabopen test<CR>")
//         }).then(async ([newtab, _]) => {
//             expect(newtab.active).toEqual(true)
//             await driver.wait(untilTabUrlMatches(driver, newtab.id, new RegExp("^https://www.google.com/.*test")), 10000)
//         }).finally(() => killDriver(driver))
//     })

//     test("`:tabopen example.org<CR>` opens example.org.", async () => {
//         const driver = await getDriver()
//         return newTabWithoutChangingOldTabs(driver, async () => {
//             await sendKeys(driver, ":tabopen example.org<CR>")
//         }).then(async ([newtab, _]) => {
//             expect(newtab.active).toEqual(true)
//             await driver.wait(untilTabUrlMatches(driver, newtab.id, "example.org"), 10000)
//         }).finally(() => killDriver(driver))
//     })

//     test("`:tabopen search duckduckgo<CR>` opens google.", async () => {
//         const driver = await getDriver()
//         return newTabWithoutChangingOldTabs(driver, async () => {
//             await sendKeys(driver, ":tabopen search duckduckgo<CR>")
//         }).then(async ([newtab, _]) => {
//             expect(newtab.active).toEqual(true)
//             await driver.wait(untilTabUrlMatches(driver, newtab.id, new RegExp("^https://www.google.com/search.*duckduckgo")), 10000)
//         }).finally(() => killDriver(driver))
//     })

//     test("`:tabopen -b about:blank<CR>` opens a background tab.", async () => {
//         const driver = await getDriver()
//         return newTabWithoutChangingOldTabs(driver, async () => {
//             await sendKeys(driver, ":tabopen -b about:blank<CR>")
//         }).then(async ([newtab, _]) => {
//             expect(newtab.active).toEqual(false)
//             await driver.wait(untilTabUrlMatches(driver, newtab.id, "about:blank"))
//         }).finally(() => killDriver(driver))
//     })

//     test("`:tabopen -c work about:blank<CR>` opens about:blank in a container.", async () => {
//         const driver = await getDriver()
//         return newTabWithoutChangingOldTabs(driver, async () => {
//             await sendKeys(driver, ":tabopen -c work about:blank<CR>")
//         }).then(async ([newtab, _]) => {
//             expect(newtab.active).toEqual(true)
//             expect(newtab.cookieStoreId).toMatch("firefox-container-")
//             await driver.wait(untilTabUrlMatches(driver, newtab.id, "about:blank"))
//         }).finally(() => killDriver(driver))
//     })

//     test("`:tabopen -b -c work search qwant<CR>` opens about:blank in a container.", async () => {
//         const driver = await getDriver()
//         return newTabWithoutChangingOldTabs(driver, async () => {
//             await sendKeys(driver, ":tabopen -b -c work search qwant<CR>")
//         }).then(async ([newtab, _]) => {
//             expect(newtab.active).toEqual(false)
//             expect(newtab.cookieStoreId).toMatch("firefox-container-")
//             await driver.wait(untilTabUrlMatches(driver, newtab.id, new RegExp("^https://www.google.com/search.*qwant")))
//         }).finally(() => killDriver(driver))
//     })
})

// vim: tabstop=4 shiftwidth=4 expandtab

import { promises as fs } from "fs"
import * as os from "os"
import * as path from "path"
import { By } from "selenium-webdriver"
import { Driver } from "selenium-webdriver/firefox"
import * as Until from "selenium-webdriver/lib/until"
import {
    getDriver,
    getDriverAndProfileDirs,
    iframeLoaded,
    sendKeys,
} from "./utils"

jest.setTimeout(100000)

// API docs because I waste too much time looking for them every time I go back to this:
// https://seleniumhq.github.io/selenium/docs/api/javascript/

describe("webdriver", () => {
    let driver: Driver
    beforeEach(async () => {
        driver = await getDriver()
    })

    afterEach(async () => {
        await driver.quit()
    })

    interface Tab {
        active: boolean
        id: number
        url?: string
        cookieStoreId?: string
    }

    /** Switch to tab and wait for it to load, or fail. */
    async function untilTabUrlMatches(
        driver: Driver,
        tabId: number,
        pattern: string | RegExp,
    ) {
        return driver.wait(
            async function () {
                const result = await driver.executeScript<Tab | null>(
                    `return tri.browserBg.tabs.get(${tabId})`,
                )
                return result?.url?.match(pattern) !== null
            },
            10000,
            `Timed out waiting for tab ${tabId} URL to match ${pattern}`,
        )
    }

    /** Utility to open a new tab and wait for it to load with test assertions. */
    async function newTabWithoutChangingOldTabs(
        driver: Driver,
        callback: (tabsBefore: Tab[]) => Promise<void>,
    ) {
        const tabsBefore = await driver.executeScript<Tab[]>(
            "return tri.browserBg.tabs.query({})",
        )
        await callback(tabsBefore)

        const tabsAfter = await driver.wait<Tab[]>(
            async () => {
                let tabs: any[]
                do {
                    tabs = await driver.executeScript<Tab[]>(
                        "return tri.browserBg.tabs.query({})",
                    )
                } while (tabs.length === tabsBefore.length)
                return tabs
            },
            10000,
            "Timed out waiting for new tab to open",
        )

        // A single new tab has been created
        expect(tabsAfter.length).toBe(tabsBefore.length + 1)

        const newTab = tabsAfter.find(
            tab => !tabsBefore.some(oldTab => oldTab.id === tab.id),
        )
        if (!newTab) {
            throw new Error("Failed to identify the new tab")
        }

        const ignoredProperties = [
            "active",
            "highlighted",
            "index",
            "lastAccessed",
        ]
        const oldTabsUpdated = tabsAfter.filter(tab => tab !== newTab)

        tabsBefore.forEach((oldTab, index) => {
            const updatedTab = oldTabsUpdated[index]
            const oldTabCopy = { ...oldTab }
            const updatedTabCopy = { ...updatedTab }

            ignoredProperties.forEach(prop => {
                delete oldTabCopy[prop]
                delete updatedTabCopy[prop]
            })

            expect(updatedTabCopy).toEqual(oldTabCopy)
        })

        return newTab
    }

    // A simple ternary doesn't work inline :(
    function testbutskipplatforms(...platforms: string[]) {
        return platforms.includes(os.platform()) ? test.skip : test
    }

    test("`:rssexec` works", async () => {
        try {
            await sendKeys(
                driver,
                ":set rsscmd js " +
                    "const elem=document.createElement('span');" +
                    "elem.id='rsscmdExecuted';" +
                    "elem.innerText=`%u`;" +
                    "document.body.appendChild(elem)<CR>",
            )

            // First, make sure completions are offered
            await driver.get(
                "file:///" + process.cwd() + "/e2e_tests/html/rss.html",
            )
            const iframe = await iframeLoaded(driver)
            await sendKeys(driver, ":rssexec ")
            await driver.switchTo().frame(iframe)
            const elements = await driver.findElements(
                By.className("RssCompletionOption"),
            )
            expect(elements.length).toBeGreaterThan(3)
            const url = await elements[0].getAttribute("innerText")

            // Then, make sure rsscmd is executed and has the right arguments
            await sendKeys(driver, "<Tab><CR>")
            await (driver.switchTo() as any).parentFrame()
            const elem = await driver.wait(
                Until.elementLocated(By.id("rsscmdExecuted")),
            )
            expect(url).toMatch(await elem.getAttribute("innerText"))
        } catch (e) {
            fail(e)
        }
    })

    test("`:editor` works", async () => {
        try {
            const addedText =
                "There are %l lines and %c characters in this textarea."

            if (os.platform() == "win32") {
                await sendKeys(
                    driver,
                    `:set editorcmd echo | set /p text="${addedText}" >> %f<CR>`,
                )
            } else {
                await sendKeys(
                    driver,
                    `:set editorcmd /bin/echo -n '${addedText}' >> %f<CR>`,
                )
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
            expect(
                await driver.executeScript(
                    `return document.getElementById("${areaId}").value`,
                ),
            ).toEqual(
                text +
                    addedText
                        .replace("%l", "3")
                        .replace("%c", "" + text.split("\n")[2].length),
            )
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
            const elements = await driver.findElements(
                By.className("GuisetCompletionOption"),
            )
            expect(elements.length).toBeGreaterThan(0)

            // Use whatever the first suggestion is
            await sendKeys(driver, "<Tab> <Tab><CR>")
            await driver.sleep(2000)
            expect(
                await driver.executeScript(
                    `return document.getElementById("tridactyl-input").value`,
                ),
            ).toEqual(
                "userChrome.css written. Please restart Firefox to see the changes.",
            )
            const profile = newProfiles.find(async p =>
                (await fs.readdir(path.join(p, "chrome"))).find(files =>
                    files.match("userChrome.css$"),
                ),
            )
            expect(profile).toBeDefined()
        } catch (e) {
            fail(e)
        } finally {
            await driver.quit()
        }
    })

    test("`:colourscheme` works", async () => {
        try {
            expect(
                await driver.executeScript(
                    `return document.documentElement.className`,
                ),
            ).toMatch("TridactylOwnNamespace TridactylThemeDefault")
            await sendKeys(driver, ":colourscheme dark<CR>")
            await driver.sleep(100)
            expect(
                await driver.executeScript(
                    `return document.documentElement.className`,
                ),
            ).toMatch("TridactylOwnNamespace TridactylThemeDark")
        } catch (e) {
            fail(e)
        }
    })

    test("`:setpref` works", async () => {
        const { driver, newProfiles } = await getDriverAndProfileDirs()
        try {
            await sendKeys(driver, `:setpref a.b.c "d"<CR>`)
            await driver.sleep(2000)
            const file = await fs.readFile(
                path.join(newProfiles[0], "user.js"),
                {
                    encoding: "utf-8",
                },
            )
            expect(file).toMatch(/user_pref\("a.b.c", "d"\);/)
        } catch (e) {
            fail(e)
        }
    })

    test("`:tabopen<CR>` opens the newtab page.", async () => {
        try {
            const newTab = await newTabWithoutChangingOldTabs(
                driver,
                async tabsBefore => {
                    await sendKeys(driver, ":tabopen<CR>")
                },
            )
            // The new tab is active
            expect(newTab.active).toEqual(true)
            // Its url is the newtab page's url
            await untilTabUrlMatches(
                driver,
                newTab.id,
                new RegExp("moz-extension://.*/static/newtab.html"),
            )
        } catch (e) {
            fail(e)
        }
    })

    test("`:tabopen https://example.org<CR>` opens example.org.", async () => {
        try {
            const newTab = await newTabWithoutChangingOldTabs(
                driver,
                async () => {
                    await sendKeys(driver, ":tabopen https://example.org<CR>")
                },
            )
            expect(newTab.active).toEqual(true)
            await untilTabUrlMatches(driver, newTab.id, "https://example.org")
        } catch (e) {
            fail(e)
        }
    })

    test("`:tabopen duckduckgo https://example.org<CR>` opens duckduckgo.", async () => {
        try {
            const newTab = await newTabWithoutChangingOldTabs(
                driver,
                async () => {
                    await sendKeys(
                        driver,
                        ":tabopen duckduckgo https://example.org<CR>",
                    )
                },
            )
            expect(newTab.active).toEqual(true)
            await untilTabUrlMatches(
                driver,
                newTab.id,
                new RegExp("https?://duckduckgo.com/?.*/"),
            )
        } catch (e) {
            fail(e)
        }
    })

    test("`:tabopen -b about:blank<CR>` opens a background tab.", async () => {
        try {
            const newTab = await newTabWithoutChangingOldTabs(
                driver,
                async () => {
                    await sendKeys(driver, ":tabopen -b about:blank<CR>")
                },
            )
            expect(newTab.active).toEqual(false)
            await untilTabUrlMatches(driver, newTab.id, "about:blank")
        } catch (e) {
            fail(e)
        }
    })

    test("`:tabopen -c work about:blank<CR>` opens about:blank in a container.", async () => {
        try {
            const newTab = await newTabWithoutChangingOldTabs(
                driver,
                async () => {
                    await sendKeys(driver, ":tabopen -c work about:blank<CR>")
                },
            )
            expect(newTab.active).toEqual(true)
            expect(newTab.cookieStoreId).toMatch("firefox-container-")
            await untilTabUrlMatches(driver, newTab.id, "about:blank")
        } catch (e) {
            fail(e)
        }
    })

    test("`:tabopen -b -c work search qwant<CR>` opens about:blank in a container.", async () => {
        try {
            const newTab = await newTabWithoutChangingOldTabs(
                driver,
                async () => {
                    await sendKeys(
                        driver,
                        ":tabopen -b -c work search qwant<CR>",
                    )
                },
            )
            expect(newTab.active).toEqual(false)
            expect(newTab.cookieStoreId).toMatch("firefox-container-")
            await untilTabUrlMatches(
                driver,
                newTab.id,
                new RegExp("^https://www.google.com/search.*qwant"),
            )
        } catch (e) {
            fail(e)
        }
    })
})

// vim: tabstop=4 shiftwidth=4 expandtab

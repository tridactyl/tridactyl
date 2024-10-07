import * as process from "process"
const env = process.env
import * as fs from "fs"
import * as os from "os"
import * as path from "path"
import { Browser, Builder, By } from "selenium-webdriver"
import { Options, Driver } from "selenium-webdriver/firefox"
import * as Until from "selenium-webdriver/lib/until"
import { getNewestFileIn, sendKeys } from "./utils"

jest.setTimeout(100000)

// API docs because I waste too much time looking for them every time I go back to this:
// https://seleniumhq.github.io/selenium/docs/api/javascript/

describe("webdriver", () => {
    async function iframeLoaded(driver: Driver) {
        return driver.wait(Until.elementLocated(By.id("cmdline_iframe")))
    }

    let driver: Driver
    beforeAll(async () => {
        driver = await getDriver()
    })

    afterAll(async () => {
        await driver.quit()
    })

    async function getDriver() {
        const extensionPath = await getNewestFileIn(
            path.resolve("web-ext-artifacts"),
        )

        const options = new Options()
        if (env["HEADLESS"]) {
            options.addArguments("--headless")
        }
        const driver = new Builder()
            .forBrowser(Browser.FIREFOX)
            .setFirefoxOptions(options)
            .build() as unknown as Driver

        // This will be the default tab.
        await driver.installAddon(extensionPath, true)
        // Wait until addon is loaded and :tutor is displayed
        await iframeLoaded(driver)
        const handles = (await driver.getAllWindowHandles())
        // And wait a bit more otherwise Tridactyl won't be happy
        await driver.sleep(500)
        // Kill the original tab.
        await driver.switchTo().window(handles[0])
        await driver.close()
        // Switch back to the good tab.
        await driver.switchTo().window(handles[1])
        // Now return the window that we want to use.
        return driver
    }

    async function getDriverAndProfileDirs() {
        const rootDir = os.tmpdir()
        // First, find out what profile the driver is using
        const profiles = fs.readdirSync(rootDir).map(p => path.join(rootDir, p))
        const driver = await getDriver()
        const newProfiles = fs
            .readdirSync(rootDir)
            .map(p => path.join(rootDir, p))
            .filter(p => p.match("moz") && !profiles.includes(p))

        // Tridactyl's tmp profile detection is broken on windows and OSX
        if (["win32", "darwin"].includes(os.platform())) {
            await sendKeys(driver, `:set profiledir ${newProfiles[0]}<CR>`)
            await driver.sleep(1000)
        }

        return { driver, newProfiles }
    }

    async function untilTabUrlMatches(
        driver: Driver,
        tabId: number,
        pattern: string | RegExp,
    ) {
        return driver.wait(
            async function () {
                const result = await driver.executeScript(
                    `return tri.browserBg.tabs.get(${tabId})`,
                )
                if (
                    typeof result === "object" &&
                    result !== null &&
                    "url" in result
                ) {
                    return (
                        (result as { url: string }).url.match(pattern) !== null
                    )
                }
                return false
            },
            10000,
            `Timed out waiting for tab ${tabId} URL to match ${pattern}`,
        )
    }

    async function newTabWithoutChangingOldTabs(
        driver: Driver,
        callback: (tabsBefore: any[]) => Promise<void>,
    ) {
        const tabsBefore = await driver.executeScript<any[]>(
            "return tri.browserBg.tabs.query({})",
        )
        await callback(tabsBefore)

        const tabsAfter = await driver.wait(
            async () => {
                let tabs: any[]
                do {
                    tabs = await driver.executeScript<any[]>(
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
            expect(
                newProfiles.find(p =>
                    fs
                        .readdirSync(path.join(p, "chrome"))
                        .find(files => files.match("userChrome.css$")),
                ),
            ).toBeDefined()
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
            const file = fs.readFileSync(path.join(newProfiles[0], "user.js"), {
                encoding: "utf-8",
            })
            expect(file).toMatch(/user_pref\("a.b.c", "d"\);/)
        } catch (e) {
            fail(e)
        }
    })

    test("`:tabopen<CR>` opens the newtab page.", async () => {
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
    })

    test("`:tabopen https://example.org<CR>` opens example.org.", async () => {
        const newTab = await newTabWithoutChangingOldTabs(driver, async () => {
            await sendKeys(driver, ":tabopen https://example.org<CR>")
        })
        expect(newTab.active).toEqual(true)
        await untilTabUrlMatches(driver, newTab.id, "https://example.org")
    })

    test("`:tabopen qwant https://example.org<CR>` opens qwant.", async () => {
        const newTab = await newTabWithoutChangingOldTabs(driver, async () => {
            await sendKeys(driver, ":tabopen qwant https://example.org<CR>")
        })
        expect(newTab.active).toEqual(true)
        await untilTabUrlMatches(
            driver,
            newTab.id,
            new RegExp("^https://www.qwant.com/.*example.org"),
        )
    })
})

// vim: tabstop=4 shiftwidth=4 expandtab

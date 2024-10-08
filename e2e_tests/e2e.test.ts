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
    beforeEach(async () => {
        driver = await getDriver()
    })

    afterEach(async () => {
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
        const handles = await driver.getAllWindowHandles()
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

    interface Tab {
        active: boolean
        id: number
        url?: string
    }

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

    test("`:tabopen duckduckgo https://example.org<CR>` opens duckduckgo.", async () => {
        const newTab = await newTabWithoutChangingOldTabs(driver, async () => {
            await sendKeys(
                driver,
                ":tabopen thisisnotduckduckgo https://example.org<CR>",
            )
        })
        expect(newTab.active).toEqual(true)
        await untilTabUrlMatches(
            driver,
            newTab.id,
            new RegExp("https?://duckduckgo.com/?.*/"),
        )
    })
})

// vim: tabstop=4 shiftwidth=4 expandtab

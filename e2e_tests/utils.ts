import { promises as fs } from "fs"
import * as path from "path"
import * as os from "os"
import * as process from "process"
import { Browser, Builder, By, Key, WebDriver } from "selenium-webdriver"
import { Driver, Options } from "selenium-webdriver/firefox"
import * as Until from "selenium-webdriver/lib/until"
const env = process.env

/** Returns the path of the newest file in directory */
export async function getNewestFileIn(directory: string): Promise<string> {
    try {
        // Get list of files
        const names = await fs.readdir(directory)

        // Get their stat structs
        const stats = await Promise.all(
            names.map(async name => {
                const filePath = path.join(directory, name)
                const stat = await fs.stat(filePath)
                return { path: filePath, mtime: stat.mtime }
            }),
        )

        // Sort by most recent and return the path of the newest file
        return stats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime())[0]
            ?.path
    } catch (error) {
        console.error(`Error reading directory ${directory}:`, error)
        throw new Error("Couldn't find extension path")
    }
}

export async function iframeLoaded(driver: Driver) {
    return driver.wait(Until.elementLocated(By.id("cmdline_iframe")))
}

export async function getDriver() {
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
    // Wait for multiple window handles to be available (extension may open in new tab)
    await driver.wait(async () => {
        const handles = await driver.getAllWindowHandles()
        return handles.length >= 2
    }, 10000)
    // Give the extension a bit more time to initialize
    await driver.sleep(500)
    let handles = await driver.getAllWindowHandles()
    // Handle edge case where extension loads in same tab (some headless configurations)
    if (handles.length === 1) {
        await driver.wait(async () => {
            const newHandles = await driver.getAllWindowHandles()
            return newHandles.length >= 2
        }, 10000)
        handles = await driver.getAllWindowHandles()
    }
    // Kill the original tab.
    await driver.switchTo().window(handles[0])
    await driver.close()
    // Switch to the new tab (extension opens in new tab)
    await driver.switchTo().window(handles[1])
    // Wait for Tridactyl iframe to appear - ensures extension is fully loaded
    await driver.wait(Until.elementLocated(By.id("cmdline_iframe")), 10000)
    // Now return the window that we want to use.
    return driver
}

export async function getDriverAndProfileDirs() {
    const rootDir = os.tmpdir()
    // First, find out what profile the driver is using
    const profiles = (await fs.readdir(rootDir)).map(p => path.join(rootDir, p))
    const driver = await getDriver()
    const newProfiles = (await fs.readdir(rootDir))
        .map(p => path.join(rootDir, p))
        .filter(p => p.match("moz") && !profiles.includes(p))

    // Tridactyl's tmp profile detection is broken on windows and OSX
    if (["win32", "darwin"].includes(os.platform())) {
        await sendKeys(driver, `:set profiledir ${newProfiles[0]}<CR>`)
        await driver.sleep(1000)
    }

    return { driver, newProfiles }
}

const vimToSelenium = {
    Down: Key.ARROW_DOWN,
    Left: Key.ARROW_LEFT,
    Right: Key.ARROW_RIGHT,
    Up: Key.ARROW_UP,
    BS: Key.BACK_SPACE,
    Del: Key.DELETE,
    End: Key.END,
    CR: Key.ENTER,
    Esc: Key.ESCAPE,
    Home: Key.HOME,
    PageDown: Key.PAGE_DOWN,
    PageUp: Key.PAGE_UP,
    Tab: Key.TAB,
    lt: "<",
}

const modToSelenium = {
    A: Key.ALT,
    C: Key.CONTROL,
    M: Key.META,
    S: Key.SHIFT,
}

export async function sendKeys(driver: WebDriver, keys: string) {
    const delay = 100

    async function sendSingleKey(key: string) {
        await driver.actions().sendKeys(key).perform()
        await driver.sleep(delay)
    }

    async function sendSpecialKey(specialKey: string) {
        const noBrackets = specialKey.slice(1, -1)
        if (noBrackets.includes("-")) {
            const [modifiers, key] = noBrackets.split("-")
            const mods = modifiers.split("").map(mod => modToSelenium[mod])
            let actions = driver.actions()
            for (const mod of mods) {
                actions = actions.keyDown(mod)
            }
            actions = actions.sendKeys(vimToSelenium[key] || key)
            for (const mod of mods) {
                actions = actions.keyUp(mod)
            }
            await actions.perform()
        } else {
            await sendSingleKey(vimToSelenium[noBrackets] || noBrackets)
        }
    }

    keys = keys.replace(":", "<S-;>")
    const regexp = /<[^>-]+-?[^>]*>/g
    const specialKeys = keys.match(regexp) || []
    const regularKeys = keys.split(regexp)

    for (let i = 0; i < Math.max(specialKeys.length, regularKeys.length); i++) {
        if (i < regularKeys.length && regularKeys[i]) {
            for (const key of regularKeys[i].split("")) {
                await sendSingleKey(key)
            }
        }
        if (i < specialKeys.length) {
            await sendSpecialKey(specialKeys[i])
        }
    }
}

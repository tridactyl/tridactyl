import * as fs from "fs"
import * as path from "path"
import * as webdriver from "selenium-webdriver"

// Returns the path of the newest file in directory
export async function getNewestFileIn(directory: string) {
        // Get list of files
        const names = ((await new Promise((resolve, reject) => {
                fs.readdir(directory, (err: Error, filenames: string[]) => {
                        if (err) {
                                return reject(err)
                        }
                        return resolve(filenames)
                })
                // Keep only files matching pattern
        })) as string[])
        // Get their stat struct
        const stats = await Promise.all(names.map(name => new Promise((resolve, reject) => {
                const fpath = path.join(directory, name)
                fs.stat(fpath, (err: any, stats) => {
                        if (err) {
                                reject(err)
                        }
                        (stats as any).path = fpath
                        return resolve(stats)
                })
        })))
        // Sort by most recent and keep first
        return ((stats.sort((stat1: any, stat2: any) => stat2.mtime - stat1.mtime)[0] || {}) as any).path
}

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

export function sendKeys (driver, keys) {
    const delay = 300
    function chainRegularKeys (previousPromise, regularKeys) {
        return regularKeys
            .split("")
            .reduce((p, key) => p
                .then(() => driver.actions().sendKeys(key).perform())
                .then(() => driver.sleep(delay))
                , previousPromise)
    }
    function chainSpecialKey (previousPromise, specialKey) {
        return previousPromise
            .then(() => {
                const noBrackets = specialKey.slice(1,-1)
                if (noBrackets.includes("-")) {
                    const [modifiers, key] = noBrackets.split("-")
                    const mods = modifiers.split("").map(mod => modToSelenium[mod])
                    return mods
                        .reduce((actions, mod) => actions.keyUp(mod),
                            mods.reduce((actions, mod) => actions.keyDown(mod), driver.actions())
                            .sendKeys(vimToSelenium[key] || key))
                        .perform()
                }
                return driver.actions().sendKeys(vimToSelenium[noBrackets] || noBrackets).perform()
            })
            .then(() => driver.sleep(delay))
    }

    let result = Promise.resolve()
    const regexp = /<[^>-]+-?[^>]*>/g
    const specialKeys = keys.match(regexp)
    if (!specialKeys) {
        return chainRegularKeys(result, keys)
    }
    const regularKeys = keys.split(regexp)
    let i
    for (i = 0; i < Math.min(specialKeys.length, regularKeys.length); ++i) {
        result = chainSpecialKey(chainRegularKeys(result, regularKeys[i]), specialKeys[i])
    }
    if (i < regularKeys.length) {
        result = regularKeys
            .slice(i)
            .reduce((previousPromise, currentKeys) => chainRegularKeys(previousPromise, currentKeys), result)
    }
    if ( i < specialKeys.length) {
        result = specialKeys
            .slice(i)
            .reduce((previousPromise, currentKey) => chainSpecialKey(previousPromise, currentKey), result)
    }
    return result
}

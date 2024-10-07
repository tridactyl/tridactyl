import { promises as fs } from 'fs';
import * as path from "path"
import { WebDriver, Key, Actions } from "selenium-webdriver"

/** Returns the path of the newest file in directory */
export async function getNewestFileIn(directory: string): Promise<string | undefined> {
    try {
        // Get list of files
        const names = await fs.readdir(directory);

        // Get their stat structs
        const stats = await Promise.all(names.map(async (name) => {
            const filePath = path.join(directory, name);
            const stat = await fs.stat(filePath);
            return { path: filePath, mtime: stat.mtime };
        }));

        // Sort by most recent and return the path of the newest file
        return stats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime())[0]?.path;
    } catch (error) {
        console.error(`Error reading directory ${directory}:`, error);
        return undefined;
    }
}

const vimToSelenium = {
    "Down": Key.ARROW_DOWN,
    "Left": Key.ARROW_LEFT,
    "Right": Key.ARROW_RIGHT,
    "Up": Key.ARROW_UP,
    "BS": Key.BACK_SPACE,
    "Del": Key.DELETE,
    "End": Key.END,
    "CR": Key.ENTER,
    "Esc": Key.ESCAPE,
    "Home": Key.HOME,
    "PageDown": Key.PAGE_DOWN,
    "PageUp": Key.PAGE_UP,
    "Tab": Key.TAB,
    "lt": "<",
}

const modToSelenium = {
    "A": Key.ALT,
    "C": Key.CONTROL,
    "M": Key.META,
    "S": Key.SHIFT,
}

export async function sendKeys(driver: WebDriver, keys: string) {
    const delay = 500;

    async function chainRegularKeys(regularKeys) {
        for (const key of regularKeys.split("")) {
            await driver.actions().sendKeys(key).perform();
            await driver.sleep(delay);
        }
    }

    async function chainSpecialKey(specialKey) {
        const noBrackets = specialKey.slice(1, -1);
        if (noBrackets.includes("-")) {
            const [modifiers, key] = noBrackets.split("-");
            const mods = modifiers.split("").map(mod => modToSelenium[mod]);
            let actions = driver.actions();
            for (const mod of mods) {
                actions = actions.keyDown(mod);
            }
            actions = actions.sendKeys(vimToSelenium[key] || key);
            for (const mod of mods) {
                actions = actions.keyUp(mod);
            }
            await actions.perform();
        } else {
            await driver.actions().sendKeys(vimToSelenium[noBrackets] || noBrackets).perform();
        }
        await driver.sleep(delay);
    }

    keys = keys.replace(":", "<S-;>");
    const regexp = /<[^>-]+-?[^>]*>/g;
    const specialKeys = keys.match(regexp);

    if (!specialKeys) {
        await chainRegularKeys(keys);
        return;
    }

    const regularKeys = keys.split(regexp);
    for (let i = 0; i < Math.max(specialKeys.length, regularKeys.length); i++) {
        if (i < regularKeys.length && regularKeys[i]) {
            await chainRegularKeys(regularKeys[i]);
        }
        if (i < specialKeys.length) {
            await chainSpecialKey(specialKeys[i]);
        }
    }
}

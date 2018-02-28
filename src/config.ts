import { DEFAULTS } from './config_defaults'
import * as Background from './config_background'
import * as Content from './config_content'

const isContent = inContentScript()

/** * Get the value of the key target. */
export function get(...path: string[]): any {
    // if(isContent) return Content.getFromCache(path)
    return Background.get(path)
}

/** Full target specification, then value.
    e.g.
        set("nmaps", "o", "open")
        set("search", "default", "google")
        set("aucmd", "BufRead", "memrise.com", "open memrise.com")
*/
export function set(...args: any[]): void {
    if (args.length < 2) {
        throw `Must provide > 2 arguments!`
    }

    const path = args.slice(0, args.length - 1)
    const newVal = args[args.length - 1]

    // if(isContent) return Content.set(path, newVal)
    return Background.set(path, newVal)
}

/** Delete key at path if it exists. */
export function unset(...path: string[]): void {
    // if(isContent) return Content.unset(path)
    return Background.unset(path)
}

/**
 * Get the value of the key target, but wait for config to be loaded from the
 * database first if it has not been at least once before. This is useful if you
 * are a content script and you've just been loaded.
 */
export async function getAsync(...path: string[]): Promise<any> {
    // if(isContent) return Content.getAsync(path)
    return Background.getAsync(path)
}

export function getAllConfig(): object {
    // if(isContent) return Content.getAllFromCache()
    return Background.getAllConfig()
}

function inContentScript(): boolean {
    return !('tabs' in browser)
}

import DEFAULTS from './config_defaults'
import * as Utils from './utils'

export const CONFIG_NAME = 'config'
const asyncGetters = []
let initialised = false
let userConfig = Object.create(null)

init()
browser.storage.onChanged.addListener((changes, area) => {
    if (CONFIG_NAME in changes) userConfig = changes[CONFIG_NAME].newValue
})

export function resetToDefaults(): void {
    Utils.setStorage(CONFIG_NAME, DEFAULTS)
    userConfig = DEFAULTS
}

/** * Get the value of the key target. */
export function get(...path: string[]): any {
    return getDeepProperty(userConfig, path)
}

function getDeepProperty(obj: object, path: string[]): any {
    if (obj !== undefined && path.length)
        return getDeepProperty(obj[path[0]], path.slice(1))
    return obj
}

async function save(): Promise<void> {
    Utils.setStorage(CONFIG_NAME, userConfig)
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

    setDeepProperty(userConfig, newVal, path)
    save()

    function setDeepProperty(obj: object, newVal: any, path: string[]): void {
        if (path.length > 1) {
            // If necessary antecedent objects don't exist, create them.
            if (obj[path[0]] === undefined) {
                obj[path[0]] = Object.create(null)
            }
            return setDeepProperty(obj[path[0]], newVal, path.slice(1))
        } else {
            obj[path[0]] = newVal
        }
    }
}

/** Delete key at path if it exists. */
export function unset(...path: string[]): void {
    const parent = getDeepProperty(userConfig, path.slice(0, -1))
    if (parent !== undefined) delete parent[path.slice(-1)[0]]
    save()
}

/**
 * Get the value of the key target, but wait for config to be loaded from the
 * database first if it has not been at least once before. This is useful if you
 * are a content script and you've just been loaded.
 */
export async function getAsync(...path: string[]): Promise<any> {
    if (initialised) {
        return get(...path)
    } else {
        return new Promise(resolve =>
            asyncGetters.push(() => resolve(get(...path)))
        )
    }
}

export async function getAllConfig(): Promise<object> {
    if(initialised) return userConfig
    return new Promise(res =>
        asyncGetters.push(() => res(userConfig))
    )
}

async function init() {
    try {
        const storage = await Utils.getStorage(CONFIG_NAME)
        userConfig = storage ? storage : DEFAULTS
    } finally {
        if (!initialised) {
            initialised = true
            asyncGetters.forEach(get => get())
        }
    }
}

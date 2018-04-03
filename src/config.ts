import DEFAULTS from './config_defaults'
import * as Utils from './utils'

export const CONFIG_NAME = 'config'
const asyncGetters: (() => void)[] = []
let initialised = false
let userConfig = Object.create(null)

init()
browser.storage.onChanged.addListener((changes, area) => {
    if (CONFIG_NAME in changes) userConfig = changes[CONFIG_NAME].newValue
})

export async function resetToDefaults(): Promise<void> {
    userConfig = DEFAULTS
    save()
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
        throw 'You must provide at least two arguments!'
    }

    const path = args.slice(0, args.length - 1)
    const newVal = args[args.length - 1]

    setDeepProperty(userConfig, newVal, path)
    save()
}

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
    if (initialised) return userConfig
    return new Promise(res => asyncGetters.push(() => res(userConfig)))
}

/** Updates the config to the latest version. Proposed semantic for config
    versionning:
     - x.y -> x+1.0 : major architectural changes
     - x.y -> x.y+1 : renaming settings/changing their types There's no need for
       an updater if you're only adding a new setting/changing a default setting
*/
export async function migrate(cfgObj: object): Promise<object> {
    let ver = getDeepProperty(cfgObj, ['configversion'])
    if (!ver) ver = '0.0'

    // Use fall-through to migrate to latest version
    switch (ver) {
        case '0.0':
            await migrate_00_to_10(cfgObj)
        case '1.0':
            migrate_10_to_11(cfgObj)
    }

    setDeepProperty(cfgObj, '1.1', ['configversion'])
    return cfgObj

    async function migrate_00_to_10(cfgObj: object): Promise<object> {
        try {
            // Before we had a config system, we had nmaps, and we put them in the
            // root namespace because we were young and bold.
            let legacy_nmaps = await browser.storage.sync.get('nmaps')
            if (legacy_nmaps['nmaps'])
                cfgObj['nmaps'] = Object.assign(
                    legacy_nmaps['nmaps'],
                    cfgObj['nmaps']
                )
        } catch (e) {
            console.error('Error while migration from 0.0 -> 1.0', e)
        }
        return cfgObj
    }

    function migrate_10_to_11(cfgObj: object): object {
        // Rename vimium-gi => gimode
        // true => 'nextinput'; false => 'firefox'

        let vimiumgi = getDeepProperty(cfgObj, ['vimium-gi'])
        if (vimiumgi === true || vimiumgi === 'true')
            setDeepProperty(cfgObj, 'nextinput', ['gimode'])
        else if (vimiumgi === false || vimiumgi === 'false')
            setDeepProperty(cfgObj, 'firefox', ['gimode'])
        delete cfgObj['vimium-gi']
        return cfgObj
    }
}

async function init() {
    try {
        const storage = await Utils.getStorage(CONFIG_NAME)
        const cfg = storage ? storage : DEFAULTS
        userConfig = await migrate(cfg)
    } finally {
        if (!initialised) {
            initialised = true
            asyncGetters.forEach(get => get())
        }
    }
}

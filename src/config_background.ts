import { DEFAULTS } from './config_defaults'
import * as controller from './controller'
import * as Messaging from './messaging'

const RC_NAME = 'rc-text'

const asyncGetters = []
let initialised = false
let userConfig = o(null)

export function getAllConfig(): object {
    return userConfig
}

export function get(path: string[]): any {
    return getDeepProperty(userConfig, path)
}

export async function getAsync(path: string[]): Promise<any> {
    if (initialised) {
        return get(path)
    } else {
        return new Promise(resolve =>
            asyncGetters.push(() => resolve(get(path)))
        )
    }
}

export function set(path: string[], value: any): void {
    setDeepProperty(userConfig, value, path)
    sendToContent()

    function setDeepProperty(obj: object, newVal: any, path: string[]): void {
        if (path.length > 1) {
            // If necessary antecedent objects don't exist, create them.
            if (obj[path[0]] === undefined) {
                obj[path[0]] = o({})
            }
            return setDeepProperty(obj[path[0]], newVal, path.slice(1))
        } else {
            obj[path[0]] = newVal
        }
    }
}

export function unset(path: string[]): void {
    const parent = getDeepProperty(userConfig, path.slice(0, -1))
    if (parent !== undefined) delete parent[path.slice(-1)[0]]
    sendToContent()
}

function getDeepProperty(obj: object, path: string[]): any {
    if (obj !== undefined && path.length)
        return getDeepProperty(obj[path[0]], path.slice(1))
    return obj
}

async function sendToContent(): Promise<void> {
    // Messaging.messageAllTabs("config_content", 'setCache', [userConfig])
}

async function loadRc(): Promise<void> {
    const rcFile = await getSyncStorage(RC_NAME)
    console.log(`RC is: ${rcFile}`)
}

async function init(): Promise<void> {
    try {
        Object.assign(userConfig, DEFAULTS)
        await loadRc()
    } finally {
        initialised = true
        for (let waiter of asyncGetters) {
            waiter()
        }
    }
}

async function getSyncStorage(name: string): Promise<any> {
    return browser.storage.sync.get(name)[name]
}

function o(object) {
    return Object.assign(Object.create(null), object)
}

init()
// Messaging.addListener(
//     'config_background',
//     Messaging.attributeCaller({
//         getAllConfig,
//         getAsync,
//         get,
//         set,
//         unset,
//     })
// )

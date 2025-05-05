/**
 * Graceful compat for APIs that aren"t supported everywhere
 */

// should maybe use compile time defines here, but not sure that we can have separate extensions for android and desktop

let _isAndroid: boolean

export async function isAndroid(): Promise<boolean> {
    if (_isAndroid === undefined) {
        return browser.runtime.getPlatformInfo().then(info => {
            _isAndroid = info.os === "android"
            return _isAndroid
        })
    }
    return _isAndroid
}
isAndroid()

export const isChrome = () => typeof browser === undefined // if they ever support web extension standards this will break

export const windows = {
    create: async (props: browser.windows._CreateCreateData) => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis
            return browser.windows.create(props)
        } else {
            if (Array.isArray(props.url)) return notImplemented("tried to create multiple windows")
            if (props.incognito) return notImplemented("tried to create an incognito window") // but android does have incognito so how do we open them?
            return browser.tabs.create({url: props.url})
        }
    }
}

export function notImplemented(message: string) {
    return console.warn(message) // TODO: something nicer
}

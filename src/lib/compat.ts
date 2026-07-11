/**
 * Graceful compat for APIs that aren"t supported everywhere
 */

import { hasBrowserApi } from "@src/lib/platform"

// should maybe use compile time defines here, but not sure that we can have separate extensions for android and desktop

let isAndroidPromise: Promise<boolean> | undefined

export function isAndroid(): Promise<boolean> {
    if (isAndroidPromise === undefined) {
        isAndroidPromise = browser.runtime
            .getPlatformInfo()
            .then(info => info.os === "android")
            .catch(error => {
                isAndroidPromise = undefined
                throw error
            })
    }
    return isAndroidPromise
}

export const bookmarks = {
    create: async (...args: Parameters<typeof browser.bookmarks.create>): Promise<browser.bookmarks.BookmarkTreeNode> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.bookmarks.create(...args)
        } else {
            return unsupportedApi("API bookmarks.create is not supported on Android.")
        }
    },
    getTree: async (): Promise<browser.bookmarks.BookmarkTreeNode[]> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.bookmarks.getTree()
        } else {
            return []
        }
    },
    remove: async (...args: Parameters<typeof browser.bookmarks.remove>): Promise<void> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.bookmarks.remove(...args)
        } else {
            return unsupportedApi("API bookmarks.remove is not supported on Android.")
        }
    },
    search: async (...args: Parameters<typeof browser.bookmarks.search>): Promise<browser.bookmarks.BookmarkTreeNode[]> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.bookmarks.search(...args)
        } else {
            return []
        }
    }
}

export const commands = {
    getAll: async (): Promise<browser.commands.Command[]> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.commands.getAll()
        } else {
            return []
        }
    },
    onCommand: {
        addListener: (callback: (command: string) => void): void => {
            if (hasBrowserApi(browser, ["commands", "onCommand"])) {
                // eslint-disable-next-line unsupported-apis-firefox-android
                browser.commands.onCommand.addListener(callback)
            } else {
                notImplemented("Event commands.onCommand is not supported on Android.")
            }
        },
        removeListener: (callback: (command: string) => void): void => {
            if (hasBrowserApi(browser, ["commands", "onCommand"])) {
                // eslint-disable-next-line unsupported-apis-firefox-android
                browser.commands.onCommand.removeListener(callback)
            } // no need to do anything since we can't have ever added a listener
        },
        hasListener: (callback: (command: string) => void): boolean => {
            if (hasBrowserApi(browser, ["commands", "onCommand"])) {
                // eslint-disable-next-line unsupported-apis-firefox-android
                return browser.commands.onCommand.hasListener(callback)
            }
            return false // assume no listener
        }
    },
    update: async (...args: Parameters<typeof browser.commands.update>): Promise<void> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.commands.update(...args)
        } else {
            return unsupportedApi("API commands.update is not supported on Android.")
        }
    }
}

export const downloads = {
    download: async (...args: Parameters<typeof browser.downloads.download>): Promise<number> => {
        if (hasBrowserApi(browser, ["downloads", "download"])) {
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.downloads.download(...args)
        }
        return unsupportedApi("API downloads.download is not supported.")
    },
    onChanged: {
        addListener: (callback: Parameters<typeof browser.downloads.onChanged.addListener>[0]): void => {
            if (hasBrowserApi(browser, ["downloads", "onChanged"])) {
                // eslint-disable-next-line unsupported-apis-firefox-android
                browser.downloads.onChanged.addListener(callback)
            } else {
                unsupportedApi("Event downloads.onChanged is not supported.")
            }
        },
        removeListener: (callback: Parameters<typeof browser.downloads.onChanged.removeListener>[0]): void => {
            if (hasBrowserApi(browser, ["downloads", "onChanged"])) {
                // eslint-disable-next-line unsupported-apis-firefox-android
                browser.downloads.onChanged.removeListener(callback)
            }
        },
    },
    search: async (...args: Parameters<typeof browser.downloads.search>): Promise<browser.downloads.DownloadItem[]> => {
        if (hasBrowserApi(browser, ["downloads", "search"])) {
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.downloads.search(...args)
        }
        return unsupportedApi("API downloads.search is not supported.")
    },
}

// --- Find ---
export const find = {
    find: async (...args: Parameters<typeof browser.find.find>) => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.find.find(...args)
        } else {
            return { count: 0, rangeData: [] }
        }
    }
}

// --- History ---
export const history = {
    search: async (...args: Parameters<typeof browser.history.search>): Promise<browser.history.HistoryItem[]> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.history.search(...args)
        } else {
            return []
        }
    }
}

export const omnibox = {
    onInputEntered: {
        addListener: (callback: (text: string, disposition: browser.omnibox.OnInputEnteredDisposition) => void): void => {
            if (hasBrowserApi(browser, ["omnibox", "onInputEntered"])) {
                // eslint-disable-next-line unsupported-apis-firefox-android
                browser.omnibox.onInputEntered.addListener(callback)
            } else {
                notImplemented("Event omnibox.onInputEntered is not supported on Android.")
            }
        },
        removeListener: (callback: (text: string, disposition: browser.omnibox.OnInputEnteredDisposition) => void): void => {
            if (hasBrowserApi(browser, ["omnibox", "onInputEntered"])) {
                // eslint-disable-next-line unsupported-apis-firefox-android
                browser.omnibox.onInputEntered.removeListener(callback)
            }
        },
        hasListener: (callback: (text: string, disposition: browser.omnibox.OnInputEnteredDisposition) => void): boolean => {
            if (hasBrowserApi(browser, ["omnibox", "onInputEntered"])) {
                // eslint-disable-next-line unsupported-apis-firefox-android
                return browser.omnibox.onInputEntered.hasListener(callback)
            }
            return false
        }
    },
    setDefaultSuggestion: async (...args: Parameters<typeof browser.omnibox.setDefaultSuggestion>): Promise<void> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.omnibox.setDefaultSuggestion(...args)
        } else {
            return unsupportedApi("API omnibox.setDefaultSuggestion is not supported on Android.")
        }
    }
}

export const runtime = {
    sendNativeMessage: async (...args: Parameters<typeof browser.runtime.sendNativeMessage>): Promise<any> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.runtime.sendNativeMessage(...args)
        } else {
            return unsupportedApi("API runtime.sendNativeMessage is not supported on Android.")
        }
    }
}


export const search = {
    get: async (): Promise<browser.search.SearchEngine[]> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.search.get()
        } else {
            return []
        }
    },
    search: async (...args: Parameters<typeof browser.search.search>): Promise<void> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.search.search(...args)
        } else {
            return unsupportedApi("API search.search is not supported on Android.")
        }
    }
}

// --- Sessions ---
// Firefox Android lacks session values, so retain their ephemeral semantics in
// the background process and clone values as the native API would.
const tabSessionValues = new Map<number, Map<string, any>>()
const windowSessionValues = new Map<number, Map<string, any>>()

export function clearTabSessionValues(tabId: number) {
    tabSessionValues.delete(tabId)
}

export function clearWindowSessionValues(windowId: number) {
    windowSessionValues.delete(windowId)
}

function getSessionValue(values: Map<number, Map<string, any>>, id: number, key: string) {
    const value = values.get(id)?.get(key)
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value))
}

function setSessionValue(
    values: Map<number, Map<string, any>>,
    id: number,
    key: string,
    value: any,
) {
    if (!values.has(id)) values.set(id, new Map())
    values.get(id).set(key, JSON.parse(JSON.stringify(value)))
}

function removeSessionValue(
    values: Map<number, Map<string, any>>,
    id: number,
    key: string,
) {
    const entries = values.get(id)
    entries?.delete(key)
    if (entries?.size === 0) values.delete(id)
}

export const sessions = {
    getRecentlyClosed: async (...args: Parameters<typeof browser.sessions.getRecentlyClosed>): Promise<browser.sessions.Session[]> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.sessions.getRecentlyClosed(...args)
        } else {
            return []
        }
    },
    getTabValue: async (...args: Parameters<typeof browser.sessions.getTabValue>) => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.sessions.getTabValue(...args)
        } else {
            return getSessionValue(tabSessionValues, args[0], args[1])
        }
    },
    getWindowValue: async (...args: Parameters<typeof browser.sessions.getWindowValue>) => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.sessions.getWindowValue(...args)
        } else {
            return getSessionValue(windowSessionValues, args[0], args[1])
        }
    },
    removeTabValue: async (...args: Parameters<typeof browser.sessions.removeTabValue>): Promise<void> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.sessions.removeTabValue(...args)
        } else {
            removeSessionValue(tabSessionValues, args[0], args[1])
        }
    },
    removeWindowValue: async (...args: Parameters<typeof browser.sessions.removeWindowValue>): Promise<void> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.sessions.removeWindowValue(...args)
        } else {
            removeSessionValue(windowSessionValues, args[0], args[1])
        }
    },
    restore: async (...args: Parameters<typeof browser.sessions.restore>): Promise<browser.sessions.Session> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.sessions.restore(...args)
        } else {
            return unsupportedApi("API sessions.restore is not supported on Android.")
        }
    },
    setTabValue: async (...args: Parameters<typeof browser.sessions.setTabValue>): Promise<void> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.sessions.setTabValue(...args)
        } else {
            setSessionValue(tabSessionValues, args[0], args[1], args[2])
        }
    },
    setWindowValue: async (...args: Parameters<typeof browser.sessions.setWindowValue>): Promise<void> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.sessions.setWindowValue(...args)
        } else {
            setSessionValue(windowSessionValues, args[0], args[1], args[2])
        }
    }
}

export const sidebarAction = {
    close: async (): Promise<void> => {
        if (hasBrowserApi(browser, ["sidebarAction", "close"])) {
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.sidebarAction.close()
        } else {
            return unsupportedApi("API sidebarAction.close is not supported on Android.")
        }
    },
    open: async (): Promise<void> => {
        if (hasBrowserApi(browser, ["sidebarAction", "open"])) {
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.sidebarAction.open()
        } else {
            return unsupportedApi("API sidebarAction.open is not supported on Android.")
        }
    },
    setPanel: async (...args: Parameters<typeof browser.sidebarAction.setPanel>): Promise<void> => {
        if (hasBrowserApi(browser, ["sidebarAction", "setPanel"])) {
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.sidebarAction.setPanel(...args)
        } else {
            return unsupportedApi("API sidebarAction.setPanel is not supported on Android.")
        }
    },
    toggle: async (): Promise<void> => {
        if (hasBrowserApi(browser, ["sidebarAction", "toggle"])) {
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.sidebarAction.toggle()
        } else {
            return unsupportedApi("API sidebarAction.toggle is not supported on Android.")
        }
    }
}

export const tabs = {
    discard: async (...args: Parameters<typeof browser.tabs.discard>): Promise<void> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.tabs.discard(...args)
        } else {
            return unsupportedApi("API tabs.discard is not supported on Android.")
        }
    },
    duplicate: async (...args: Parameters<typeof browser.tabs.duplicate>): Promise<browser.tabs.Tab> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.tabs.duplicate(...args)
        } else {
            return unsupportedApi("API tabs.duplicate is not supported on Android.") // consider creating a tab with the current URL and properties
        }
    },
    getZoom: async (...args: Parameters<typeof browser.tabs.getZoom>): Promise<number> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.tabs.getZoom(...args)
        } else {
            return unsupportedApi("API tabs.getZoom is not supported on Android.")
        }
    },
    hide: async (...args: Parameters<typeof browser.tabs.hide>): Promise<number[]> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.tabs.hide(...args)
        } else {
            return unsupportedApi("API tabs.hide is not supported on Android.")
        }
    },
    move: async (...args: Parameters<typeof browser.tabs.move>): Promise<browser.tabs.Tab | browser.tabs.Tab[]> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.tabs.move(...args)
        } else {
            return unsupportedApi("API tabs.move is not supported on Android.")
        }
    },
    onMoved: {
        addListener: (callback: (tabId: number, moveInfo: {windowId: number, fromIndex: number, toIndex: number}) => void): void => {
            if (hasBrowserApi(browser, ["tabs", "onMoved"])) {
                // eslint-disable-next-line unsupported-apis-firefox-android
                browser.tabs.onMoved.addListener(callback)
            } else {
                notImplemented("Event tabs.onMoved is not supported on Android.")
            }
        },
        removeListener: (callback: (tabId: number, moveInfo: {windowId: number, fromIndex: number, toIndex: number}) => void): void => {
            if (hasBrowserApi(browser, ["tabs", "onMoved"])) {
                // eslint-disable-next-line unsupported-apis-firefox-android
                browser.tabs.onMoved.removeListener(callback)
            }
        },
        hasListener: (callback: (tabId: number, moveInfo: {windowId: number, fromIndex: number, toIndex: number}) => void): boolean => {
            if (hasBrowserApi(browser, ["tabs", "onMoved"])) {
                // eslint-disable-next-line unsupported-apis-firefox-android
                return browser.tabs.onMoved.hasListener(callback)
            }
            return false
        }
    },
    setZoom: async (tabIdOrZoom: number, zoomFactor?: number): Promise<void> => {
        if (!(await isAndroid())) {
            if (zoomFactor === undefined) {
                // eslint-disable-next-line unsupported-apis-firefox-android
                return browser.tabs.setZoom(tabIdOrZoom)
            }
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.tabs.setZoom(tabIdOrZoom, zoomFactor)
        } else {
            return unsupportedApi("API tabs.setZoom is not supported on Android.")
        }
    },
    show: async (...args: Parameters<typeof browser.tabs.show>): Promise<void> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.tabs.show(...args)
        } else {
            return unsupportedApi("API tabs.show is not supported on Android.")
        }
    },
    toggleReaderMode: async (...args: Parameters<typeof browser.tabs.toggleReaderMode>): Promise<void> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.tabs.toggleReaderMode(...args)
        } else {
            return unsupportedApi("API tabs.toggleReaderMode is not supported on Android.") // ideally would fall back to our own mode
        }
    }
}

export const topSites = {
    get: async (): Promise<browser.topSites.MostVisitedURL[]> => {
        if (hasBrowserApi(browser, ["topSites", "get"])) {
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.topSites.get()
        }
        return []
    },
}

export const windows = {
    create: async (props: browser.windows._CreateCreateData): Promise<browser.windows.Window> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.windows.create(props)
        } else {
            return unsupportedApi("API windows.create is not supported on Android.")
        }
    },
    get: async (...args: Parameters<typeof browser.windows.get>): Promise<browser.windows.Window> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.windows.get(...args)
        } else {
            return unsupportedApi(`API windows.get failed on Android`)
        }
    },
    getAll: async (...args: Parameters<typeof browser.windows.getAll>): Promise<browser.windows.Window[]> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.windows.getAll(...args)
        } else {
            return []
        }
    },
    getCurrent: async (...args: Parameters<typeof browser.windows.getCurrent>): Promise<browser.windows.Window> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.windows.getCurrent(...args)
        } else {
            return unsupportedApi(`API windows.getCurrent failed on Android`) // todo: add nicer fallback
        }
    },
    getLastFocused: async (...args: Parameters<typeof browser.windows.getLastFocused>): Promise<browser.windows.Window> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.windows.getLastFocused(...args)
        } else {
            return unsupportedApi(`API windows.getLastFocused failed on Android`)
        }
    },
    remove: async (...args: Parameters<typeof browser.windows.remove>): Promise<void> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.windows.remove(...args)
        } else {
            return unsupportedApi("API windows.remove is not supported or meaningful on Android.")
        }
    },
    update: async (...args: Parameters<typeof browser.windows.update>): Promise<browser.windows.Window> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis-firefox-android
            return browser.windows.update(...args)
        } else {
            return unsupportedApi("API windows.update is not supported or meaningful on Android.")
        }
    }
}

export function notImplemented(message: string) {
    return console.warn(message) // TODO: something nicer. should at least use our own logger
}

export function unsupportedApi(message: string): never {
    throw new Error(message)
}

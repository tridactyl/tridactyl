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


export const bookmarks = {
    create: async (...args: Parameters<typeof browser.bookmarks.create>): Promise<browser.bookmarks.BookmarkTreeNode | void> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis
            return browser.bookmarks.create(...args)
        } else {
            return notImplemented("API bookmarks.create is not supported on Android.")
        }
    },
    getTree: async (): Promise<browser.bookmarks.BookmarkTreeNode[]> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis
            return browser.bookmarks.getTree()
        } else {
            return []
        }
    },
    remove: async (...args: Parameters<typeof browser.bookmarks.remove>): Promise<void> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis
            return browser.bookmarks.remove(...args)
        } else {
            return notImplemented("API bookmarks.remove is not supported on Android.")
        }
    },
    search: async (...args: Parameters<typeof browser.bookmarks.search>): Promise<browser.bookmarks.BookmarkTreeNode[]> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis
            return browser.bookmarks.search(...args)
        } else {
            return []
        }
    }
}

export const commands = {
    getAll: async (): Promise<browser.commands.Command[]> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis
            return browser.commands.getAll()
        } else {
            return []
        }
    },
    onCommand: {
        addListener: async (callback: (command: string) => void): Promise<void> => {
            if (!(await isAndroid())) {
                // eslint-disable-next-line unsupported-apis
                browser.commands.onCommand.addListener(callback)
            } else {
                notImplemented("Event commands.onCommand is not supported on Android.")
            }
        },
        removeListener: async (callback: (command: string) => void): Promise<void> => {
            if (!(await isAndroid())) {
                // eslint-disable-next-line unsupported-apis
                browser.commands.onCommand.removeListener(callback)
            } // no need to do anything since we can't have ever added a listener
        },
        hasListener: async (callback: (command: string) => void): Promise<boolean> => {
            if (!(await isAndroid())) {
                // eslint-disable-next-line unsupported-apis
                return browser.commands.onCommand.hasListener(callback)
            }
            return false // assume no listener
        }
    },
    update: async (...args: Parameters<typeof browser.commands.update>): Promise<void> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis
            return browser.commands.update(...args)
        } else {
            return notImplemented("API commands.update is not supported on Android.")
        }
    }
}

// --- Find ---
export const find = {
    find: async (...args: Parameters<typeof browser.find.find>) => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis
            return browser.find.find(...args)
        } else {
            return notImplemented("API find.find is not supported on Android.")
        }
    }
}

// --- History ---
export const history = {
    search: async (...args: Parameters<typeof browser.history.search>): Promise<browser.history.HistoryItem[]> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis
            return browser.history.search(...args)
        } else {
            return []
        }
    }
}

export const omnibox = {
    onInputEntered: {
        addListener: async (callback: (text: string, disposition: browser.omnibox.OnInputEnteredDisposition) => void): Promise<void> => {
            if (!(await isAndroid())) {
                // eslint-disable-next-line unsupported-apis
                browser.omnibox.onInputEntered.addListener(callback)
            } else {
                notImplemented("Event omnibox.onInputEntered is not supported on Android.")
            }
        },
        removeListener: async (callback: (text: string, disposition: browser.omnibox.OnInputEnteredDisposition) => void): Promise<void> => {
            if (!(await isAndroid())) {
                // eslint-disable-next-line unsupported-apis
                browser.omnibox.onInputEntered.removeListener(callback)
            }
        },
        hasListener: async (callback: (text: string, disposition: browser.omnibox.OnInputEnteredDisposition) => void): Promise<boolean> => {
            if (!(await isAndroid())) {
                // eslint-disable-next-line unsupported-apis
                return browser.omnibox.onInputEntered.hasListener(callback)
            }
            return false
        }
    },
    setDefaultSuggestion: async (...args: Parameters<typeof browser.omnibox.setDefaultSuggestion>): Promise<void> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis
            return browser.omnibox.setDefaultSuggestion(...args)
        } else {
            return notImplemented("API omnibox.setDefaultSuggestion is not supported on Android.")
        }
    }
}

export const runtime = {
    sendNativeMessage: async (...args: Parameters<typeof browser.runtime.sendNativeMessage>): Promise<any | void> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis
            return browser.runtime.sendNativeMessage(...args)
        } else {
            return notImplemented("API runtime.sendNativeMessage is not supported on Android.")
        }
    }
}


export const search = {
    get: async (): Promise<browser.search.SearchEngine[]> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis
            return browser.search.get()
        } else {
            return []
        }
    },
    search: async (...args: Parameters<typeof browser.search.search>): Promise<void> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis
            return browser.search.search(...args)
        } else {
            return notImplemented("API search.search is not supported on Android.")
        }
    }
}

// --- Sessions ---
export const sessions = {
    getRecentlyClosed: async (...args: Parameters<typeof browser.sessions.getRecentlyClosed>): Promise<browser.sessions.Session[]> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis
            return browser.sessions.getRecentlyClosed(...args)
        } else {
            return []
        }
    },
    getTabValue: async (...args: Parameters<typeof browser.sessions.getTabValue>) => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis
            return browser.sessions.getTabValue(...args)
        } else {
            return notImplemented("API sessions.getTabValue is not supported on Android.")
        }
    },
    getWindowValue: async (...args: Parameters<typeof browser.sessions.getWindowValue>) => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis
            return browser.sessions.getWindowValue(...args)
        } else {
            return notImplemented("API sessions.getWindowValue is not supported on Android.")
        }
    },
    removeTabValue: async (...args: Parameters<typeof browser.sessions.removeTabValue>): Promise<void> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis
            return browser.sessions.removeTabValue(...args)
        } else {
            return notImplemented("API sessions.removeTabValue is not supported on Android.")
        }
    },
    removeWindowValue: async (...args: Parameters<typeof browser.sessions.removeWindowValue>): Promise<void> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis
            return browser.sessions.removeWindowValue(...args)
        } else {
            return notImplemented("API sessions.removeWindowValue is not supported on Android.")
        }
    },
    restore: async (...args: Parameters<typeof browser.sessions.restore>): Promise<browser.sessions.Session | void> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis
            return browser.sessions.restore(...args)
        } else {
            return notImplemented("API sessions.restore is not supported on Android.")
        }
    },
    setTabValue: async (...args: Parameters<typeof browser.sessions.setTabValue>): Promise<void> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis
            return browser.sessions.setTabValue(...args)
        } else {
            return notImplemented("API sessions.setTabValue is not supported on Android.")
        }
    },
    setWindowValue: async (...args: Parameters<typeof browser.sessions.setWindowValue>): Promise<void> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis
            return browser.sessions.setWindowValue(...args)
        } else {
            return notImplemented("API sessions.setWindowValue is not supported on Android.")
        }
    }
}

export const sidebarAction = {
    close: async (): Promise<void> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis
            return browser.sidebarAction.close()
        } else {
            return notImplemented("API sidebarAction.close is not supported on Android.")
        }
    },
    open: async (): Promise<void> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis
            return browser.sidebarAction.open()
        } else {
            return notImplemented("API sidebarAction.open is not supported on Android.")
        }
    },
    setPanel: async (...args: Parameters<typeof browser.sidebarAction.setPanel>): Promise<void> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis
            return browser.sidebarAction.setPanel(...args)
        } else {
            return notImplemented("API sidebarAction.setPanel is not supported on Android.")
        }
    },
    toggle: async (): Promise<void> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis
            return browser.sidebarAction.toggle()
        } else {
            return notImplemented("API sidebarAction.toggle is not supported on Android.")
        }
    }
}

export const tabs = {
    discard: async (...args: Parameters<typeof browser.tabs.discard>): Promise<browser.tabs.Tab | void> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis
            return browser.tabs.discard(...args)
        } else {
            return notImplemented("API tabs.discard is not supported on Android.")
        }
    },
    duplicate: async (...args: Parameters<typeof browser.tabs.duplicate>): Promise<browser.tabs.Tab | void> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis
            return browser.tabs.duplicate(...args)
        } else {
            return notImplemented("API tabs.duplicate is not supported on Android.") // consider creating a tab with the current URL and properties
        }
    },
    getZoom: async (...args: Parameters<typeof browser.tabs.getZoom>): Promise<number | void> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis
            return browser.tabs.getZoom(...args)
        } else {
            return notImplemented("API tabs.getZoom is not supported on Android.")
        }
    },
    hide: async (...args: Parameters<typeof browser.tabs.hide>): Promise<number[] | void> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis
            return browser.tabs.hide(...args)
        } else {
            return notImplemented("API tabs.hide is not supported on Android.")
        }
    },
    move: async (...args: Parameters<typeof browser.tabs.move>): Promise<browser.tabs.Tab | browser.tabs.Tab[] | void> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis
            return browser.tabs.move(...args)
        } else {
            return notImplemented("API tabs.move is not supported on Android.")
        }
    },
    onMoved: {
        addListener: async (callback: (tabId: number, moveInfo: {windowId: number, fromIndex: number, toIndex: number}) => void): Promise<void> => {
            if (!(await isAndroid())) {
                // eslint-disable-next-line unsupported-apis
                browser.tabs.onMoved.addListener(callback)
            } else {
                notImplemented("Event tabs.onMoved is not supported on Android.")
            }
        },
        removeListener: async (callback: (tabId: number, moveInfo: {windowId: number, fromIndex: number, toIndex: number}) => void): Promise<void> => {
            if (!(await isAndroid())) {
                // eslint-disable-next-line unsupported-apis
                browser.tabs.onMoved.removeListener(callback)
            }
        },
        hasListener: async (callback: (tabId: number, moveInfo: {windowId: number, fromIndex: number, toIndex: number}) => void): Promise<boolean> => {
            if (!(await isAndroid())) {
                // eslint-disable-next-line unsupported-apis
                return browser.tabs.onMoved.hasListener(callback)
            }
            return false
        }
    },
    setZoom: async (...args: Parameters<typeof browser.tabs.setZoom>): Promise<void> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis
            return browser.tabs.setZoom(...args)
        } else {
            return notImplemented("API tabs.setZoom is not supported on Android.")
        }
    },
    show: async (...args: Parameters<typeof browser.tabs.show>): Promise<number[] | void> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis
            return browser.tabs.show(...args)
        } else {
            return notImplemented("API tabs.show is not supported on Android.")
        }
    },
    toggleReaderMode: async (...args: Parameters<typeof browser.tabs.toggleReaderMode>): Promise<void> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis
            return browser.tabs.toggleReaderMode(...args)
        } else {
            return notImplemented("API tabs.toggleReaderMode is not supported on Android.") // ideally would fall back to our own mode
        }
    }
}

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
    },
    get: async (...args: Parameters<typeof browser.windows.get>): Promise<browser.windows.Window | void> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis
            return browser.windows.get(...args)
        } else {
            return notImplemented(`API windows.get failed on Android`)
        }
    },
    getAll: async (...args: Parameters<typeof browser.windows.getAll>): Promise<browser.windows.Window[]> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis
            return browser.windows.getAll(...args)
        } else {
            return []
        }
    },
    getCurrent: async (...args: Parameters<typeof browser.windows.getCurrent>): Promise<browser.windows.Window | void> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis
            return browser.windows.getCurrent(...args)
        } else {
            return notImplemented(`API windows.getCurrent failed on Android`) // todo: add nicer fallback
        }
    },
    getLastFocused: async (...args: Parameters<typeof browser.windows.getLastFocused>): Promise<browser.windows.Window | void> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis
            return browser.windows.getLastFocused(...args)
        } else {
            return notImplemented(`API windows.getLastFocused failed on Android`)
        }
    },
    remove: async (...args: Parameters<typeof browser.windows.remove>): Promise<void> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis
            return browser.windows.remove(...args)
        } else {
            return notImplemented("API windows.remove is not supported or meaningful on Android.")
        }
    },
    update: async (...args: Parameters<typeof browser.windows.update>): Promise<browser.windows.Window | void> => {
        if (!(await isAndroid())) {
            // eslint-disable-next-line unsupported-apis
            return browser.windows.update(...args)
        } else {
            return notImplemented("API windows.update is not supported or meaningful on Android.")
        }
    }
}

export function notImplemented(message: string) {
    return console.warn(message) // TODO: something nicer. should at least use our own logger
}

import * as Controller from './controller'
import * as Util from './utils'
import * as Config from './config'
import * as Native from './native_background'
import DEFAULTS from './config_defaults'
import Logger from './logging'

const RC_NAME = 'rc-text'
const RC_LOC_NAME = 'rc-location'
const RC_AUTOLOAD_FS_NAME = 'rc-autoload'
const RC_DEFAULT = `
; This is the default RC file. Settings not set here will be wiped upon restart.
; Just like vim, comments start with ';'
; Because I am a nice guy, here are some commented settings for you.

; Use dark mode
; set theme dark

; Disable on reddit because RES
; autocmd DocStart reddit.com mode ignore

; Bind i to ':mode ignore'
; bind i mode ignore

; Access this page with ':st'
: command st settings`

const FSRC_NOT_FOUND = `
; We didn't find a RC file at XDG_CONFIG_HOME/tridactyl/tridactyl[rc]
; Please fix it. It may also be the case you haven't installed the native
; messenger, in which case, do that. If this message is still here, file a
; bug on GitHub.`

export type RcLocation = 'filesystem' | 'browser'

export async function initConfigFromRc(): Promise<void> {
    Config.resetToDefaults()
    await detectAndSetDefaultBrowserRc()

    let isAutoload = await getAutoload()
    let location = await getLocation()
    let rcText: string

    // Default value
    if (!location) location = 'browser'
    if (!isAutoload) isAutoload = false

    console.info(`Loading RC from:`, location)

    switch (location) {
        case 'filesystem':
            rcText = await Native.getFilesystemUserConfig()
            if (!rcText) rcText = FSRC_NOT_FOUND
            break
        case 'browser':
            rcText = await getRc()
            break
        default:
            throw `Location '${location} is not valid. Please contact a dev
            and tell them to use either 'filesystem' or 'browser'.`
    }

    // If we are autoloading and we actually loaded something from
    // the filesystem, then set the rc as the thing
    if (isAutoload && location === 'filesystem') setRc(rcText)

    console.info(`RC file loaded: \n${rcText}`)
    Controller.acceptRcFile(rcText)
}

async function detectAndSetDefaultBrowserRc(): Promise<void> {
    const browserRc = await getRc()
    if (!browserRc) await setRc(RC_DEFAULT)
}

export async function getRc(): Promise<string> {
    return Util.getStorage(RC_NAME)
}

export async function setRc(newRc: string): Promise<void> {
    console.info(`Setting new RC file: \n${newRc}`)
    await Util.setStorage(RC_NAME, newRc)
}

export async function getAutoload(): Promise<boolean> {
    const store = Util.getStorage(RC_AUTOLOAD_FS_NAME)
    return store ? store : false
}

export async function setAutoload(newVal: boolean): Promise<void> {
    Util.setStorage(RC_AUTOLOAD_FS_NAME, newVal)
}

export async function getLocation(): Promise<RcLocation> {
    const store = Util.getStorage(RC_LOC_NAME)
    return store ? store : 'browser'
}

export async function setLocation(newVal: RcLocation): Promise<void> {
    Util.setStorage(RC_LOC_NAME, newVal)
}

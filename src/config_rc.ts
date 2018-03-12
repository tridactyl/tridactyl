import * as Controller from './controller'
import * as Util from './utils'
import * as Config from './config'
import * as Native from './native_background'
import DEFAULTS from './config_defaults'
import Logger from './logging'

const RC_NAME = 'rc-text'
const RC_LOC_NAME = 'rc-location'
const RC_AUTOLOAD_FS_NAME = 'rc-autoload'

export type RcLocation = 'filesystem' | 'browser'

export async function initConfigFromRc(): Promise<void> {
    Config.resetToDefaults()
    loadRc()

    const isAutoload = await getAutoload()
    const location = await getLocation()
    let rcText: string

    switch(location) {
        case 'filesystem':
            rcText = await Native.getFilesystemUserConfig()
            break
        case 'browser':
            rcText = await getRc()
            break
    }

    if(!rcText) rcText = '; NO TEXT FOUND'
    if(isAutoload && location === 'filesystem') setRc(rcText)

    console.info(`RC file loaded: \n${rcText}`)
    Controller.acceptRcFile(rcText)
}

async function loadRc(): Promise<void> {
    const rcFile = await getRc()
    console.info(`RC file found: ${rcFile}`)
    if (rcFile) Controller.acceptRcFile(rcFile)
}

export async function getRc(): Promise<string> {
    return Util.getStorage(RC_NAME)
}

export async function setRc(newRc: string): Promise<void> {
    console.info(`Setting new RC file: ${newRc}`)
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

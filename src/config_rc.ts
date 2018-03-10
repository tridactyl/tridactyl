import * as Controller from './controller'
import * as Util from './utils'
import * as Config from './config'
import DEFAULTS from './config_defaults'
import Logger from './logging'

const RC_NAME = 'rc-text'

export async function initConfigFromRc(): Promise<void> {
    Config.resetToDefaults()
    loadRc()
}

export async function loadRc(): Promise<void> {
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
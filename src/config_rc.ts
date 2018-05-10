import * as Controller from "./controller"
import * as Util from "./utils"
import * as Config from "./config"
import * as Native from "./native_background"
import * as Messaging from "./messaging"
import DEFAULTS from "./config_defaults"
import Logger from "./logging"

const RC_NAME = "rc-text"
const RC_LOC_NAME = "rc-location"
const RC_AUTOLOAD_FS_NAME = "rc-autoload"
const RC_DEFAULT = `
" This is the default RC file.
" Because I am a nice guy, here are some commented settings for you.
" We don't support "in-line" comments yet:
" Your comment must be an entire line starting with a quote mark

" Wipe addon settings every time this file is loaded
" resetConfigToDefault

" Use dark mode
" set theme dark

" Disable on reddit because RES
" autocmd DocStart reddit.com mode ignore

" Bind i to ':mode ignore'
" bind i mode ignore

" Access this page with ':st'
" command st settings`

const FSRC_NOT_FOUND = `
" Something went wrong with loading the file from the filesystem. Please make
" sure that all of the following are true:
"  - You have a file at XDG_CONFIG_HOME/tridactyl/tridactylrc
"  - You have installed the native app
"  - No unusual errors are being reported in the console
" If you are still lost, file a bug on GitHub or contact us on Gitter/Matrix. `

export type RcLocation = "filesystem" | "browser"

export async function initConfigFromRc(): Promise<void> {
    await detectAndSetDefaultBrowserRc()

    let isAutoload = await getAutoload()
    let location = await getLocation()
    let rcText: string

    // Default value
    if (!location) location = "browser"
    if (!isAutoload) isAutoload = false

    console.info(`Loading RC from:`, location)

    switch (location) {
        case "filesystem":
            rcText = await getFilesystemRc()
            break
        case "browser":
            rcText = await getBrowserRc()
            break
        default:
            throw `Location '${location}' is not valid. Please contact a dev
            and tell them to use either 'filesystem' or 'browser'.`
    }

    // If we are autoloading and we actually loaded something from
    // the filesystem, then set the rc as the thing
    if (isAutoload && location === "filesystem") setBrowserRc(rcText)

    runRc(rcText)
}

export function runRc(rc: string): void {
    for (let cmd of rcFileToExCmds(rc)) {
        Controller.acceptExCmd(cmd)
    }
}

export function rcFileToExCmds(rcText: string): string[] {
    const excmds = rcText.split("\n")

    // Remove comment lines
    return excmds.filter(x => x != "" && !x.trim().startsWith('"'))
}

async function detectAndSetDefaultBrowserRc(): Promise<void> {
    const browserRc = await getBrowserRc()
    if (!browserRc) await setBrowserRc(RC_DEFAULT)
}

export async function getFilesystemRc(): Promise<string> {
    return Native.getFilesystemUserConfig()
}

export async function getBrowserRc(): Promise<string> {
    return Util.getStorage(RC_NAME)
}

export async function setBrowserRc(newRc: string): Promise<void> {
    console.info(`Setting new RC file: \n${newRc}`)
    await Util.setStorage(RC_NAME, newRc)
}

export async function getAutoload(): Promise<boolean> {
    const store = Util.getStorage(RC_AUTOLOAD_FS_NAME)
    return store || false
}

export async function setAutoload(newVal: boolean): Promise<void> {
    Util.setStorage(RC_AUTOLOAD_FS_NAME, newVal)
}

export async function getLocation(): Promise<RcLocation> {
    const store = Util.getStorage(RC_LOC_NAME)
    return store ? store : "browser"
}

export async function setLocation(newVal: RcLocation): Promise<void> {
    Util.setStorage(RC_LOC_NAME, newVal)
}

import * as SELF from "./config_rc"
Messaging.addListener("config_rc", Messaging.attributeCaller(SELF))

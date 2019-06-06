/** Extensions and compatibility

 Looks us and communicates with other installed extensions so we can
 be compatible with them.

*/

import * as Logging from "@src/lib/logging"
const logger = new Logging.Logger("messaging")

/** Friendly-names of extensions that are used in different places so
    that we can refer to them with more readable and less magic ids.
 */
export const KNOWN_EXTENSIONS = {
    temp_containers: "{c607c8df-14a7-4f28-894f-29e8722976af}",
    multi_account_containers: "@testpilot-containers",
    tree_style_tab: "treestyletab@piro.sakura.ne.jp",
}

type KnownExtensionId = keyof typeof KNOWN_EXTENSIONS

/** List of currently installed extensions.
 */
const knownInstalledExtensions: Map<KnownExtensionId, browser.management.IExtensionInfo> = new Map()

function updateExtensionInfo(
    extension: browser.management.IExtensionInfo,
): void {
    Object.keys(KNOWN_EXTENSIONS).forEach((k: KnownExtensionId) => {
        if (KNOWN_EXTENSIONS[k] === extension.id) {
            knownInstalledExtensions.set(k, extension)
        }
    })
}

export function getExtensionEnabled(id: KnownExtensionId): boolean {
    if (getExtensionInstalled(id)) {
        return knownInstalledExtensions.get(id).enabled
    } else {
        return false
    }
}

export function getExtensionInstalled(id: KnownExtensionId): boolean {
    return knownInstalledExtensions.has(id)
}

async function hasManagementPermission() {
    return browser.permissions.contains({
        "permissions": ["management"],
    })
}

/** Read installed extensions to populate the list at startup time.
 */
export async function init() {
    // If we don't have the permission, bail out. Our list of
    // installed extensions will be left uninitialized, so all of our
    // external interfaces will pretend that no other extensions
    // exist. This SHOULD result in tridactyl acting the same as it
    // did before the extension interoperability feature was added in
    // the first place, which isn't a great loss.
    const hasPermission = await hasManagementPermission()
    if (!hasPermission) {
        return
    }

    // Code borrowed from
    // https://github.com/stoically/temporary-containers/blob/master/src/background/management.js
    let extensions = []
    try {
        extensions = await browser.management.getAll()
    } catch (e) {
        return
    }

    extensions.map(updateExtensionInfo)

    browser.management.onInstalled.addListener(updateExtensionInfo)
    browser.management.onEnabled.addListener(updateExtensionInfo)
    browser.management.onDisabled.addListener(updateExtensionInfo)
    browser.management.onUninstalled.addListener(updateExtensionInfo)
}

export async function listenForMessage(id: KnownExtensionId, callback: (message) => void) {
    browser.runtime.onMessageExternal.addListener((message, sender) => {
        if (sender.id === KNOWN_EXTENSIONS[id]) {
            callback(message)
        }
    })
}

export async function messageExtension(id: KnownExtensionId, message: any) {
    try {
        return browser.runtime.sendMessage(KNOWN_EXTENSIONS[id], message)
    } catch (e) {
        logger.error("Failed to communicate with extension ", id, e)
    }
}

/** Extensions and compatibility

 Looks us and communicates with other installed extensions so we can
 be compatible with them.

 */

/** Friendly-names of extensions that are used in different places so
    that we can refer to them with more readable and less magic ids.
 */
export const KNOWN_EXTENSIONS: { [name: string]: string } = {
    temp_containers: "{c607c8df-14a7-4f28-894f-29e8722976af}",
    multi_account_containers: "@testpilot-containers",
}

/** List of currently installed extensions.
 */
const installedExtensions: {
    [id: string]: browser.management.ExtensionInfo
} = {}

function updateExtensionInfo(
    extension: browser.management.ExtensionInfo,
): void {
    installedExtensions[extension.id] = extension
}

export function getExtensionEnabled(id: string): boolean {
    if (getExtensionInstalled(id)) {
        return installedExtensions[id].enabled
    } else {
        return false
    }
}

export function getExtensionInstalled(id: string): boolean {
    return id in installedExtensions
}

async function hasManagementPermission() {
    return browser.permissions.contains({
        permissions: ["management"],
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

    for (const extension of extensions) {
        installedExtensions[extension.id] = extension
    }

    browser.management.onInstalled.addListener(updateExtensionInfo)
    browser.management.onEnabled.addListener(updateExtensionInfo)
    browser.management.onDisabled.addListener(updateExtensionInfo)
    browser.management.onUninstalled.addListener(updateExtensionInfo)
}

/** Return a list of extensions installed by the user.
 */
export async function listExtensions() {
    await init()
    return Object.keys(installedExtensions)
        .map(key => installedExtensions[key])
        .filter(obj => obj.optionsUrl.length > 0)
}

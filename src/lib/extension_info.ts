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
    [id: string]: browser.management.IExtensionInfo
} = {}

function updateExtensionInfo(
    extension: browser.management.IExtensionInfo,
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

/** Read installed extensions to populate the list at startup time.
 */
async function init() {
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

init()

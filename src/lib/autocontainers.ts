/** Auto Containers

 Hook into webRequests and make sure that your (least) favorite domain is contained
 and doesn't touch your default browsing environment.

  For declaring containers that do not yet exist, consider using `auconcreatecontainer true` in your tridactylrc.
  This allows tridactyl to automatically create containers from your autocontain directives. Note that they will be random icons and colors.

 ** NB: This is an experimental feature, if you encounter issues please create an issue on github. **

  The domain is passed through as a regular expression so there are a few gotchas to be aware of:
  * Unescaped periods will match *anything*. `autocontain google.co.uk work` will match `google!co$uk`. Escape your periods or accept that you might get some false positives.
  * You can use regex in your domain pattern. `autocontain google\\.(co\\.uk|com) work` will match either `google.co.uk` or `google.com`.

 A lot of the inspiration for this code was drawn from the Mozilla `contain facebook` Extension.
 https://github.com/mozilla/contain-facebook/

 This feature is experimental and may cause heavy CPU usage.

 Issue in MAC that is seemingly caused by the same thing:
 https://github.com/mozilla/multi-account-containers/issues/572

 */

import * as Config from "@src/lib/config"
import * as Container from "@src/lib/containers"
import * as Logging from "@src/lib/logging"
import * as ExtensionInfo from "@src/lib/extension_info"

const logger = new Logging.Logger("containers")

interface ICancelledRequest {
    requestIds: any
    urls: any
}

interface IAutoContain {
    autoContain(details): any
    cancelEarly(tab: browser.tabs.Tab, details): boolean
    cancelRequest(tab: browser.tabs.Tab, details): void
    clearCancelledRequests(tabId: number): void
    getCancelledRequest(tabId: number): ICancelledRequest
    completedRequestListener(details): void
    autocontainConfigured(): boolean
    getAuconAndProxiesForUrl(url: string): Promise<[string, string[]]>
    getAuconForDetails(details): Promise<string>
}

export class AutoContain implements IAutoContain {
    private cancelledRequests: ICancelledRequest[] = []
    private lastCreatedTab = null

    tabCreatedListener = tab => {
        this.lastCreatedTab = tab
    }

    completedRequestListener = details => {
        if (this.getCancelledRequest(details.tabId)) {
            this.clearCancelledRequests(details.tabId)
        }
    }

    autocontainConfigured = (): boolean => {
        // No autocontain directives, no nothing.
        const aucons = Config.get("autocontain")
        return Object.keys(aucons).length !== 0
    }

    autoContain = async (
        details,
    ): Promise<browser.webRequest.BlockingResponse> => {
        if (!this.autocontainConfigured()) return { cancel: false }

        // Only handle in strict mode.
        if (Config.get("autocontainmode") === "relaxed")
            return { cancel: false }

        // Only handle http requests.
        if (details.url.search("^https?://") < 0) return { cancel: false }

        // Do not handle invalid tabIds.
        if (details.tabId === -1) return { cancel: false }

        // Do all of our async lookups in parallel.
        const [
            tab,
            otherExtensionHasPriority,
            cookieStoreId,
        ] = await Promise.all([
            browser.tabs.get(details.tabId),
            this.checkOtherExtensionsHavePriority(details),
            this.getAuconForDetails(details),
        ])

        // If any other extensions claim this request, we'll ignore it and let them handle it.
        if (otherExtensionHasPriority) return { cancel: false }

        // Do not handle private tabs.
        if (tab.incognito) return { cancel: false }

        // Silently return if we're already in the correct container.
        if (tab.cookieStoreId === cookieStoreId) return { cancel: false }

        if (this.cancelEarly(tab, details)) return { cancel: true }

        // If this navigation created a tab, we cancel and then kill
        // the newly-created tab after opening.
        const removeTab =
            this.lastCreatedTab && this.lastCreatedTab.id === tab.id

        // Figure out which tab should be the parent of the tab we'll
        // be creating in the selected container.
        const openerTabId = removeTab ? tab.openerTabId : tab.id

        logger.debug(
            "in tab %o and with details %o, reopening from container %o to container %o",
            tab,
            details,
            tab.cookieStoreId,
            cookieStoreId,
        )
        browser.tabs
            .create({
                url: details.url,
                cookieStoreId,
                active: tab.active,
                windowId: tab.windowId,
                index: tab.index + 1,
                openerTabId,
            })
            .then(result => {
                logger.debug("Autocontainer created tab %o", result)
            })

        if (removeTab) {
            logger.debug("Closing newly-opened tab %o", tab)
            browser.tabs.remove(tab.id)
        }

        return { cancel: true }
    }

    // Handles the requests after the initial checks made in this.autoContain.
    cancelEarly = (tab: browser.tabs.Tab, details): boolean => {
        if (!this.cancelledRequests[tab.id]) {
            this.cancelRequest(tab, details)
        } else {
            let cancel = false

            if (
                this.cancelledRequests[tab.id].requestIds[details.requestId] ||
                this.cancelledRequests[tab.id].urls[details.url]
            ) {
                cancel = true
            }

            this.cancelledRequests[tab.id].requestIds[details.requestId] = true
            this.cancelledRequests[tab.id].urls[details.url] = true

            return cancel
        }
        return false
    }

    cancelRequest = (tab: browser.tabs.Tab, details): void => {
        this.cancelledRequests[tab.id] = {
            requestIds: {
                [details.requestId]: true,
            },
            urls: {
                [details.url]: true,
            },
        }

        // The webRequest events onCompleted and onErrorOccurred are not 100% reliable.
        // Mozilla's contain facebook extension points this out and adds a guaranteed removal so we'll do the same.
        setTimeout(() => {
            this.clearCancelledRequests(tab.id)
        }, 2000)
    }

    getCancelledRequest = (tabId: number): ICancelledRequest =>
        this.cancelledRequests[tabId]

    // Clear the cancelled requests.
    clearCancelledRequests = (tabId: number): void => {
        if (this.cancelledRequests[tabId]) {
            delete this.cancelledRequests[tabId]
        }
    }

    // Checks to see if there are any other container-related extensions and avoids getting into
    // fights with them.
    checkOtherExtensionsHavePriority = async (details): Promise<boolean> => {
        // The checks for each extension can be done in parallel.
        const priorities = await Promise.all([
            this.checkMACPriority(details),
            this.checkTempContainersPriority(details),
        ])
        return priorities.some(t => t)
    }

    checkMACPriority = async (details): Promise<boolean> => {
        if (
            !ExtensionInfo.getExtensionEnabled(
                ExtensionInfo.KNOWN_EXTENSIONS.multi_account_containers,
            )
        ) {
            // It can't take priority if it's not enabled.
            logger.debug("multi-account containers extension does not exist")
            return false
        }

        // Do not handle urls that are claimed by the multi-account
        // containers extension. Code from
        // https://github.com/mozilla/multi-account-containers/wiki/API
        const macAssignment = await browser.runtime
            .sendMessage(
                ExtensionInfo.KNOWN_EXTENSIONS.multi_account_containers,
                {
                    method: "getAssignment",
                    url: details.url,
                },
            )
            .catch(error => {
                logger.warning(
                    "failed to communicate with multi-account containers extension: %o",
                    error,
                )
                return false
            })

        if (macAssignment) {
            logger.debug(
                "multi-account containers extension has priority over autocontainer directives",
            )
            return true
        } else {
            logger.debug(
                "multi-account containers extension exists but does not claim priority",
            )
            return false
        }
    }

    checkTempContainersPriority = async (details): Promise<boolean> => {
        if (
            !ExtensionInfo.getExtensionEnabled(
                ExtensionInfo.KNOWN_EXTENSIONS.temp_containers,
            )
        ) {
            // It can't take priority if it's not enabled.
            logger.debug("temporary containers extension does not exist")
            return false
        }

        // Anything that we'd contain in the default container will be
        // handed to the temp containers extension
        const willContainInDefault =
            (await this.getAuconForDetails(details)) === "firefox-default"
        if (willContainInDefault) {
            logger.info(
                "temporary containers extension has priority over autocontainer directives",
            )
        } else {
            logger.debug(
                "temporary containers extension exists but does not claim priority",
            )
        }
        return willContainInDefault
    }

    getAuconAndProxiesForUrl = async (url: string): Promise<[string, string[]]> => {
        const aucons = Config.get("autocontain")
        const ausites = Object.keys(aucons)
        const aukeyarr = ausites.filter(e => url.search(e) >= 0).sort((a, b) => b.length - a.length)
        if (!aukeyarr.length) {
            return ["firefox-default", []]
        } else {
            const val = aucons[aukeyarr[0]]
            const matches = val.match(/(.*)\+(.*)/)
            const [aucon, proxies] = matches
                ? [matches[1], matches[2].split(",")]
                : [val, []]
            const containerExists = await Container.exists(aucon)
            if (!containerExists) {
                if (Config.get("auconcreatecontainer") === "true") {
                    await Container.create(aucon)
                } else {
                    logger.error(
                        "Specified container doesn't exist. consider setting 'auconcreatecontainer' to true",
                    )
                }
            }
            return [await Container.getId(aucon), proxies]
        }
    }

    // Parses autocontain directives and returns valid cookieStoreIds or errors.
    getAuconForDetails = async (details): Promise<string> => {
        const [aucon, ] = await this.getAuconAndProxiesForUrl(details.url)
        return aucon
    }
}

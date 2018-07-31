/** Auto Containers

 Hook into webRequests and make sure that your (least) favorite domain is contained
 and doesn't touch your default browsing environment.

  For declaring containers that do not yet exist, consider using `auconscreatecontainer true` in your tridactylrc.
  This allows tridactyl to automatically create containers from your autocontain directives. Note that they will be random icons and colors.

 ** NB: This is an experimental feature, if you encounter issues please create an issue on github. **

  The domain is passed through as a regular expression so there are a few gotchas to be aware of:
  * Unescaped periods will match *anything*. `autocontain google.co.uk work` will match `google!co$uk`. Escape your periods or accept that you might get some false positives.
  * You can use regex in your domain pattern. `autocontain google\,(co\.uk|com) work` will match either `google.co.uk` or `google.com`.

 TODO: Should try and detect Multi Account Containers and/or Contain Facebook extensions from Mozilla. 
 
 A lot of the inspiration for this code was drawn from the Mozilla `contain facebook` Extension.
 https://github.com/mozilla/contain-facebook/

 This feature is experimental and may cause heavy CPU usage.

 Issue in MAC that is seemingly caused by the same thing:
 https://github.com/mozilla/multi-account-containers/issues/572

 */

import * as Config from "../config"
import * as Container from "./containers"
import * as Logging from "../logging"

const logger = new Logging.Logger("containers")

/** An interface for the additional object that's supplied in the BlockingResponse callback.
 
 Details here:
 https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/webRequest/onBeforeRequest#details

 */
interface IDetails {
    frameAncestors: any[]
    frameId: number
    method: string
    originUrl: string
    parentFrameId: number
    proxyInfo?: any
    requestBody?: any
    requestId: string
    tabId: number
    timeStamp: number
    type: browser.webRequest.ResourceType
    url: string
}

interface ICancelledRequest {
    requestIds: any
    urls: any
}

interface IAutoContain {
    autoContain(details: IDetails): any
    cancelEarly(tab: browser.tabs.Tab, details: IDetails): boolean
    cancelRequest(tab: browser.tabs.Tab, details: IDetails): void
    clearCancelledRequests(tabId: number): void
    getCancelledRequest(tabId: number): ICancelledRequest
    parseAucons(details: IDetails): Promise<string>
}

export class AutoContain implements IAutoContain {
    private cancelledRequests: ICancelledRequest[] = []

    autoContain = async (
        details: IDetails,
    ): Promise<browser.webRequest.BlockingResponse> => {
        // No autocontain directives, no nothing.
        let aucons = Config.get("autocontain")
        if (Object.keys(aucons).length === 0) return { cancel: false }

        // Do not handle private tabs or invalid tabIds.
        if (details.tabId === -1) return { cancel: false}
        let tab = await browser.tabs.get(details.tabId)
        if (tab.incognito) return { cancel: false }

        // Only handle http requests.
        if (details.url.search("^https?://") < 0) return { cancel: false }

        let cookieStoreId = await this.parseAucons(details)

        // Silently return if we're already in the correct container.
        if (tab.cookieStoreId === cookieStoreId) return { cancel: false }

        if (this.cancelEarly(tab, details)) return { cancel: true }

        browser.tabs
            .create({
                url: details.url,
                cookieStoreId: cookieStoreId,
                active: tab.active,
                windowId: tab.windowId,
            })
            .then(_ => {
                if (details.originUrl) {
                    window.history.back()
                } else {
                    browser.tabs.remove(details.tabId)
                }
            })

        return { cancel: true }
    }

    //Handles the requests after the initial checks made in this.autoContain.
    cancelEarly = (tab: browser.tabs.Tab, details: IDetails): boolean => {
        if (!this.cancelledRequests[tab.id]) {
            this.cancelRequest(tab, details)
        } else {
            let cancel = false

            if (this.cancelledRequests[tab.id].requestIds[details.requestId] || this.cancelledRequests[tab.id].urls[details.url]) {
                cancel = true
            }

            this.cancelledRequests[tab.id].requestIds[details.requestId] = true
            this.cancelledRequests[tab.id].urls[details.url] = true

            return cancel
        }
        return false
    }

    cancelRequest = (tab: browser.tabs.Tab, details: IDetails): void => {
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

    getCancelledRequest = (tabId: number): ICancelledRequest => {
        return this.cancelledRequests[tabId]
    }

    // Clear the cancelled requests.
    clearCancelledRequests = (tabId: number): void => {
        if (this.cancelledRequests[tabId]) {
            delete this.cancelledRequests[tabId]
        }
    }

    // Parses autocontain directives and returns valid cookieStoreIds or errors.
    parseAucons = async (details): Promise<string> => {
        let aucons = Config.get("autocontain")
        const ausites = Object.keys(aucons)
        const aukeyarr = ausites.filter(
            e => details.url.search("^https?://[^/]*" + e + "/") >= 0,
        )
        if (aukeyarr.length > 1) {
            logger.error(
                "Too many autocontain directives match this url. Not containing.",
            )
            return "firefox-default"
        } else if (aukeyarr.length === 0) {
            return "firefox-default"
        } else {
            let containerExists = await Container.exists(aucons[aukeyarr[0]])
            if (!containerExists) {
                if (Config.get("auconcreatecontainer")) {
                    await Container.create(aucons[aukeyarr[0]])
                } else {
                    logger.error(
                        "Specified container doesn't exist. consider setting 'auconcreatecontainer' to true",
                    )
                }
            }
            return await Container.getId(aucons[aukeyarr[0]])
        }
    }
}

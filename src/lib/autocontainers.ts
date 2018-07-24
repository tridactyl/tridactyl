/** Auto Containers

 Hook into webRequests and make sure that your (least) favorite domain is contained
 and doesn't touch your default browsing.

 Should try and detect Multi Account Containers or Contain Facebook extensions from Mozilla.
 
 A lot of the inspiration for this code was drawn from the Mozilla `contain facebook` Extension.
 https://github.com/mozilla/contain-facebook/

 This feature is experimental and can cause heavy CPU usage.

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
        // Do not handle private tabs or invalid tabIds.
        if (details.tabId === -1) return
        let tab = await browser.tabs.get(details.tabId)
        if (tab.incognito) return

        // Only handle http requests.
        if (details.url.search("^https?://") < 0) return

        let cookieStoreId = await this.parseAucons(details)

        // Silently return if we're already in the correct container.
        if (tab.cookieStoreId === cookieStoreId) return

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
            let cr = this.getCancelledRequest(tab.id)

            if (cr.requestIds[details.requestId] || cr.urls[details.url]) {
                cancel = true
            }

            cr.requestIds[details.requestId] = true
            cr.urls[details.url] = true

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
            e => details.url.search("^https?://.*" + e + "/") >= 0,
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
            console.log(aucons[aukeyarr[0]])
            return await Container.getId(aucons[aukeyarr[0]])
        }
    }
}

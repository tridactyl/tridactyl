/** Auto Containers

 Hook into webRequests and make sure that your (least) favorite domain is contained
 and doesn't touch your default browsing.

 A lot of the inspiration for this code was taken from the Mozilla `contain facebook` Extension.
 https://github.com/mozilla/contain-facebook/

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

export interface IAutoContain {
    cancelRequest(tab: browser.tabs.Tab, details: any): boolean
    parseAucons(details: any): string
    shouldCancelEarly(tab: browser.tabs.Tab, details: any): boolean
    getCancelledRequest(tabId: number): any[]
    clearCancelledRequests(tabId: number): void
    autoContain(details: IDetails): any
}

export class AutoContain implements IAutoContain {
    private enabled: boolean
    private cancelledRequests = []

    constructor() {}

    cancelRequest(tab: browser.tabs.Tab, details: any): boolean {
        return false
    }
    parseAucons(details): string {
        let aucons = Config.get("autocontain")
        const ausites = Object.keys(aucons)
        const aukeyarr = ausites.filter(
            e => details.url.search("^https?://.*" + e + "/") >= 0,
        )
        if (aukeyarr.length > 1) {
            logger.error("Too many autocontain directives match this url.")
            return ""
        } else if (aukeyarr.length === 0) {
            return ""
        } else {
            return aucons[aukeyarr[0]]
        }
    }

    shouldCancelEarly(tab: browser.tabs.Tab, details: any): boolean {
        if (!this.cancelledRequests[tab.id]) this.cancelRequest(tab, details)
        else {
        }
        return true
    }

    // Not sure if needed.
    getCancelledRequest(tabId: number): any[] {
        return this.cancelledRequests[tabId]
    }

    // Clear the cancelled requests.
    clearCancelledRequests(tabId: number): void {
        if (this.cancelledRequests[tabId]) {
            delete this.cancelledRequests[tabId]
        }
    }

    async autoContain(
        details: IDetails,
    ): Promise<browser.webRequest.BlockingResponse> {
        // Do not handle private tabs or invalid tabIds.
        if (details.tabId === -1) return
        let tab = await browser.tabs.get(details.tabId)
        if (tab.incognito) return

        // Only handle http requests.
        if (details.url.search("^https?://") < 0) return

        // Get container name from Config. Return if containerName is the empty string.
        let containerName = this.parseAucons(details)
        if (!containerName) return

        // Checks if containerName exists and creates it if it does not.
        let containerExists = await Container.exists(containerName)
        if (!containerExists) {
            if (Config.get("auconcreatecontainer")) {
                await Container.create(containerName)
            } else {
                logger.error(
                    "Specified container doesn't exist. consider setting 'auconcreatecontainer' to true",
                )
            }
        }

        // Silently return if we're already in the correct container.
        let cookieStoreId = await Container.getId(containerName)
        if (tab.cookieStoreId === cookieStoreId) return

        let preserveTab = Config.get("auconpreservetab")
        if (preserveTab && details.originUrl) {
            window.history.back()
        } else {
            browser.tabs.remove(details.tabId)
        }

        browser.tabs.create({
            url: details.url,
            cookieStoreId: cookieStoreId,
            active: tab.active,
            windowId: tab.windowId,
        })

        return { cancel: true }
    }
}

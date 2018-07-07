import * as Messaging from "./messaging"
import * as Container from "./lib/containers"
import * as config from "./config"
import * as csp from "csp-serdes"
import Logger from "./logging"

const logger = new Logger("requests")

class DefaultMap extends Map {
    constructor(private defaultFactory, ...args) {
        super(...args)
    }

    get(key) {
        if (!this.has(key)) {
            this.set(key, this.defaultFactory(key))
        }
        return super.get(key)
    }
}

/**
 * Reduce CSP safety to permit tridactyl to run correctly
 *
 * style-src needs 'unsafe-inline' (hinting styles) and 'self' (mode indicator hiding)
 * script-src needs 'unsafe-eval' (event hijacking)
 *      - but that's pretty dangerous, so maybe we shouldn't just clobber it?
 * sandbox must not be set
 *
 * This only needs to happen because of a Firefox bug and we should stop doing
 * it when they fix the bug.
 */
export function clobberCSP(response) {
    const headers = response["responseHeaders"]
    const cspHeader = headers.find(
        header => header.name.toLowerCase() === "content-security-policy",
    )

    if (cspHeader !== undefined) {
        const policy = new DefaultMap(
            () => new Set(),
            csp.parse(cspHeader.value),
        )
        logger.info(
            "given CSP",
            cspHeader.value,
            "parsed CSP",
            policy,
            "reserialized CSP",
            csp.serialize(policy),
        )
        policy.delete("sandbox")

        // Loosen style-src directive if it or default-src are present.
        if (policy.has("default-src") && !policy.has("style-src")) {
            policy.set("style-src", policy.get("default-src"))
        }
        if (policy.has("style-src")) {
            policy
                .get("style-src")
                .add("'unsafe-inline'")
                .add("'self'")
        }

        // Replace old CSP
        cspHeader.value = csp.serialize(policy)
        logger.info("new CSP", cspHeader.value, "parsed as", policy)
        return { responseHeaders: headers }
    } else {
        return {}
    }
}

function reopenTab(tab, cookieStoreId, url) {
    browser.tabs
        .create({
            url: url,
            cookieStoreId: cookieStoreId,
            active: tab.active,
        })
        .then(_ => {
            browser.tabs.remove(tab.tabId)
        })
}

function parseAucons(details): string {
    let aucons = config.get("autocontain")
    const ausites = Object.keys(aucons)
    const aukeyarr = ausites.filter(e => details.url.search(e) >= 0)
    if (aukeyarr.length > 1) {
        logger.error("Too many autocontain directives match this url.")
        return ""
    } else if (aukeyarr.length === 0) {
        return ""
    } else {
        return aucons[aukeyarr[0]]
    }
}

/** If it quacks like an aucmd... **/
export async function autoContain(details): Promise<any> {
    console.log(details)
    let tab = await browser.tabs.get(details.tabId)

    // Don't handle private tabs or invalid tabIds.
    if (tab.incognito) return
    if (details.tabId === -1) return

    // Get container name from config. Return if containerName is the empty string.
    let containerName = parseAucons(details)
    if (!containerName) return

    // Checks if container by that name exists and creates it if false.
    let containerExists = await Container.exists(containerName)
    if (!containerExists) {
        if (config.get("auconscreatecontainer")) {
            await Container.create(containerName)
        } else {
            logger.error(
                "Specified container doesn't exist. consider setting 'auconscreatecontainer' to true",
            )
        }
    }

    // Silently return if we're already in the correct container.
    let cookieStoreId = await Container.getId(containerName)
    if (tab.cookieStoreId === cookieStoreId) return

    reopenTab(tab, cookieStoreId, details.url)
    return { cancel: true }
}

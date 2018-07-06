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
            //browser.tabs.remove(tab.tabId)
        })
}
/** If it quacks like an aucmd... **/
export async function autoContain(details) {
    let tab = await browser.tabs.get(details.tabId)
    if (tab.incognito) return
    if (details.tabId === -1) return

    try {
        let aucons = config.get("autocontain")
        const ausites = Object.keys(aucons)
        const aukeyarr = ausites.filter(e => details.url.search(e) >= 0)
        if (aukeyarr.length > 1)
            throw new Error(
                "More than one autocontain directives match this url.",
            )

        // Silently return if we're already in the correct container.
        let cookieStoreId = await Container.getId(aucons[aukeyarr[0]])
        if (tab.cookieStoreId === cookieStoreId) return

        reopenTab(tab, cookieStoreId, details.url)
        console.log(`reopenincontainer ${aucons[aukeyarr[0]]} ${details.tabId}`)
    } catch (e) {
        throw e
    }
}

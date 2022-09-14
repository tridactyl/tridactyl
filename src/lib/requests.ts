import * as csp from "csp-serdes"
import Logger from "@src/lib/logging"

const logger = new Logger("requests")

class DefaultMap<K, V> extends Map<K, V> {
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
    const headers = response.responseHeaders
    const cspHeader = headers.find(
        header => header.name.toLowerCase() === "content-security-policy",
    )

    if (cspHeader !== undefined) {
        const policy = new DefaultMap<string, Set<string>>(
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
            policy.get("style-src").add("'unsafe-inline'").add("'self'")
        }

        // Replace old CSP
        cspHeader.value = csp.serialize(policy)
        logger.info("new CSP", cspHeader.value, "parsed as", policy)
        return { responseHeaders: headers }
    } else {
        return {}
    }
}

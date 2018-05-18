import * as config from "./config"
import * as csp from "csp-serdes"

class DefaultMap extends Map {
    constructor(private defaultFactory, ...args) {
        super(...args)
    }

    get(key) {
        let ans = super.get(key)
        if (ans === undefined) {
            ans = this.defaultFactory(key)
            super.set(key, ans)
        }
        return ans
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
        policy.delete("sandbox")
        policy
            .get("style-src")
            .add("'unsafe-inline'")
            .add("'self'")
        // policy.get("script-src").add("'unsafe-eval'")
        // Replace old CSP
        cspHeader.value = csp.serialize(policy)
        return { responseHeaders: headers }
    } else {
        return {}
    }
}

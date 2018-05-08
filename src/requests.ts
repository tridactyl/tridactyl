import * as config from "./config"

export function addurltocsp(response) {
    let headers = response["responseHeaders"]
    let cspind = headers.findIndex(
        header => header.name == "Content-Security-Policy",
    )
    // if it's found
    if (cspind > -1) {
        // Split the csp header up so we can manage it individually.
        let csparr = [headers[cspind]["value"].split("; ")][0]

        for (let i = 0; i < csparr.length; i++) {
            // Add 'unsafe-inline' as a directive since we use it
            if (csparr[i].indexOf("style-src") > -1) {
                if (csparr[i].indexOf("'self'") > -1) {
                    csparr[i] = csparr[i].replace(
                        "'self'",
                        "'self' 'unsafe-inline'",
                    )
                }
            }
            // Remove the element if it's a sandbox directive
            if (csparr[i] === "sandbox") {
                csparr.splice(i, 1)
            }
        }
        // Join the header up after clobberin'
        headers[cspind]["value"] = csparr.join("; ")
    }
    return { responseHeaders: headers }
}

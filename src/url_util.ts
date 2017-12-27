/** URL handling utlity functions
 */

/** Increment the last number in a URL.
 *
 * (perhaps this could be made so you can select the "nth" number in a
 * URL rather than just the last one?)
 *
 * @param url       the URL to increment
 * @param count     increment step to advance by (can be negative)
 * @return          the incremented URL, or null if cannot be incremented
 */
export function incrementUrl(url, count) {
    // Find the final number in a URL
    let matches = url.match(/(.*?)(\d+)(\D*)$/);

    // no number in URL - nothing to do here
    if (matches === null) {
        return null
    }

    let [, pre, number, post] = matches;
    let newNumber = parseInt(number, 10) + count;
    let newNumberStr = String(newNumber > 0 ? newNumber : 0);

    // Re-pad numbers that were zero-padded to be the same length:
    // 0009 + 1 => 0010
    if (number.match(/^0/)) {
        while (newNumberStr.length < number.length) {
            newNumberStr = "0" + newNumberStr;
        }
    }

    return pre + newNumberStr + post
}

/** Get the root of a URL
 *
 * @param url   the url to find the root of
 * @return      the root of the URL, or the original URL when the URL isn't
 *              suitable for finding the root of.
 */
export function getUrlRoot(url) {
    // exclude these special protocols for now;
    if (/(about|mailto):/.test(url.protocol)) {
        return null
    }

    // this works even for file:/// where the root is ""
    return new URL(url.protocol + "//" + (url.host || ""))
}

/** Get the parent of the current URL. Parent is determined as:
 *
 * * if there is a hash fragment, strip that, or
 * * If there is a query string, strip that, or
 * * Remove one level from the path if there is one, or
 * * Remove one subdomain from the front if there is one
 *
 * @param url   the URL to get the parent of
 * @return      the parent of the URL, or null if there is no parent
 * @count       how many "generations" you wish to go back (1 = parent, 2 = grandparent, etc.)
 */
export function getUrlParent(url, count = 1) {

    // Helper function.
    function gup(parent, count) {
        if (count < 1) {
            return parent
        }
        // strip, in turn, hash/fragment and query/search
        if (parent.hash) {
            parent.hash = ''
            return gup(parent, count - 1)
        }
        if (parent.search) {
            parent.search = ''
            return gup(parent, count - 1)
        }

        // empty path is '/'
        if (parent.pathname !== '/') {
            // Remove trailing slashes and everything to the next slash:
            parent.pathname = parent.pathname.replace(/\/[^\/]*?\/*$/, '/')
            return gup(parent, count - 1)
        }

        // strip off the first subdomain if there is one
        {
            let domains = parent.host.split('.')

            // more than domain + TLD
            if (domains.length > 2) {
                //domains.pop()
                parent.host = domains.slice(1).join('.')
                return gup(parent, count - 1)
            }
        }

        // nothing to trim off URL, so no parent
        return null
    }

    // exclude these special protocols where parents don't really make sense
    if (/(about|mailto):/.test(url.protocol)) {
        return null
    }

    let parent = new URL(url)
    return gup(parent, count)
}

/** Very incomplete lookup of extension for common mime types that might be
 * encountered when saving elements on a page. There are NPM libs for this,
 * but this should cover 99% of basic cases
 *
 * @param mime  mime type to get extension for (eg 'image/png')
 *
 * @return an extension for that mimetype, or undefined if that type is not
 * supported
 */
function getExtensionForMimetype(mime: string): string {

    const types = {
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/gif": ".gif",
        "image/x-icon": ".ico",
        "image/svg+xml": ".svg",
        "image/tiff": ".tiff",
        "image/webp": ".webp",

        "text/plain": ".txt",
        "text/html": ".html",
        "text/css": ".css",
        "text/csv": ".csv",
        "text/calendar": ".ics",

        "application/octet-stream": ".bin",
        "application/javascript": ".js",
        "application/xhtml+xml": ".xhtml",

        "font/otf": ".otf",
        "font/woff": ".woff",
        "font/woff2": ".woff2",
        "font/ttf": ".ttf",
    }

    return types[mime] || ""
}

/** Get a suitable default filename for a given URL
 *
 * If the URL:
 *  - is a data URL, construct from the data and mimetype
 *  - has a path, use the last part of that (eg image.png, index.html)
 *  - otherwise, use the hostname of the URL
 *  - if that fails, "download"
 *
 * @param URL   the URL to make a filename for
 * @return      the filename according to the above rules
 */
export function getDownloadFilenameForUrl(url: URL): string {

    // for a data URL, we have no really useful naming data intrinsic to the
    // data, so we construct one using the data and guessing an extension
    // from any mimetype
    if (url.protocol === "data:") {

        // data:[<mediatype>][;base64],<data>
        const [prefix, data] = url.pathname.split(",", 2)

        const [mediatype, b64] = prefix.split(";", 2)

        // take a 15-char prefix of the data as a reasonably unique name
        // sanitize in a very rough manner
        let filename = data.slice(0, 15)
            .replace(/[^a-zA-Z0-9_\-]/g, '_')
            .replace(/_{2,}/g, '_')

        // add a base64 prefix and the extension
        filename = (b64 ? (b64 + "-") : "")
            + filename
            + getExtensionForMimetype(mediatype)

        return filename
    }

    // if there's a useful path, use that directly
    if (url.pathname !== "/") {

        let paths = url.pathname.split("/").slice(1)

        // pop off empty pat bh tails
        // e.g. https://www.mozilla.org/en-GB/firefox/new/
        while (paths.length && !paths[paths.length - 1]) {
            paths.pop()
        }

        if (paths.length) {
            return paths.slice(-1)[0]
        }
    }

    // if there's no path, use the domain (otherwise the FF-provided
    // default is just "download"
    return url.hostname || "download"
}

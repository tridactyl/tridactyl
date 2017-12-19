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
 * @count       how many times you want to get the parent.
 */
export function getUrlParent(url, count) {

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

        // pathname always starts '/'
        if (parent.pathname !== '/') {
            let path = parent.pathname.substring(1).split('/')
            path.pop()
            parent.pathname = path.join('/')
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

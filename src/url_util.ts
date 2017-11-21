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

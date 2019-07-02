/**
 * Guarantee that your string is interpreted as a string at its destination.
 */

/** Wrap with single quotes and replace each inner single quote with '\''
 *
 * Backslash does not escape characters within a single quoted string, so it
 * should be left alone.
 *
 * Reference:
 * https://www.gnu.org/savannah-checkouts/gnu/bash/manual/bash.html#Single-Quotes
 *
 */
export const sh = (dangerous: string) =>
    `'${dangerous.replace(/'/g, "'\\''")}'`

/** Escape every cmd metacharacter
 *
 * Windows doesn't create argv for your binary program. Your C library decides
 * how to quote and unquote, etc. All we can do is ensure that cmd passes it
 * all to the target program and does nothing else.
 *
 * Do that by prefixing every metacharacter with ^
 *
 * Reference:
 * https://blogs.msdn.microsoft.com/twistylittlepassagesallalike/2011/04/23/everyone-quotes-command-line-arguments-the-wrong-way/
 *
 */
export const windows_cmd = (dangerous: string) =>
    dangerous.replace(/([()%!^"<>&|])/g, "^$1")

/* Alternative implementation that prefixes all characters with ^
const windows_cmd2 = (dangerous: string) =>
    "^" + dangerous.split("").join("^")
*/

/** Updates

 Tools for updating tridactyl. Get the running version, check the
 highest known available beta, nag the user to update at reasonable
 intervals, etcetera.

 */

import SemverCompare from "semver-compare"
import * as Config from "@src/lib/config"
import * as Logging from "@src/lib/logging"
import { getTriVersion } from "@src/lib/webext"

const logger = new Logging.Logger("updates")

const TRI_VERSION = getTriVersion()

interface TriVersionFeedItem {
    releaseDate: Date
    version: string
}

export function secondsSinceLastCheck() {
    const lastCheck = Config.get("update", "lastchecktime")
    return (Date.now() - lastCheck) / 1000
}

// Ask GitHub what the latest version is
// Uncached so don't run this often
export async function getLatestVersion() {
    try {
        // If any monster any makes a novelty tag this will break.
        // So let's just ignore any errors.
        const feed = new DOMParser().parseFromString(
            await (
                await fetch("https://github.com/tridactyl/tridactyl/tags.atom")
            ).text(),
            "application/xml",
        )
        const mostRecent = feed.querySelectorAll("entry")[0]

        // Update our last update check timestamp and the version itself.
        Config.set("update", "lastchecktime", Date.now())
        const highestKnownVersion = {
            version: mostRecent.querySelector("title").textContent,
            releaseDate: new Date(
                mostRecent.querySelector("updated").textContent,
            ), // e.g. 2018-12-04T15:24:43.000Z
        }
        logger.debug(
            "Checked for new version of Tridactyl, found ",
            highestKnownVersion,
        )

        return highestKnownVersion
    } catch (e) {
        logger.error("Error while checking for updates: ", e)
    }
}

export function shouldNagForVersion(version: TriVersionFeedItem) {
    const timeSinceRelease = (Date.now() - version.releaseDate.getTime()) / 1000
    const updateNagWaitSeconds = Config.get("update", "nagwait") * 24 * 60 * 60
    const newerThanInstalled =
        SemverCompare(version.version, getInstalledPatchVersion()) > 0

    return newerThanInstalled && timeSinceRelease > updateNagWaitSeconds
}

export function naggedForVersion(version: TriVersionFeedItem) {
    const lastNaggedVersion = Config.get("update", "lastnaggedversion")
    if (lastNaggedVersion) {
        // If the version is <= the last nagged version, we've already
        // nagged for it.
        return SemverCompare(version.version, lastNaggedVersion) <= 0
    } else {
        return false
    }
}

export function updateLatestNaggedVersion(version: TriVersionFeedItem) {
    Config.set("update", "lastnaggedversion", version.version)
}

export function getInstalledPatchVersion() {
    // We're currently numbering our releases as
    // maj.min.patch-numcommits-githash,
    // e.g. 1.14.9-138-gaab4355. Even more problematically, our
    // prereleases have maj.min.patch the same as the _preceding
    // release_, not the _next_ release - 1.14.9-138 actually
    // _follows_ 1.14.9. As a result, if we used TRI_VERSION directly,
    // all of our beta users would be incorrectly notified for stable
    // releases of code that they're well past.
    //
    // To address this, we ignore our git version, depend on firefox
    // to automatically update us if we're on the beta channel, and
    // disregard the pre-release information entirely when doing our
    // own update check.
    return TRI_VERSION.replace(/pre.*/, "")
}

export function getInstalledVersion() {
    return TRI_VERSION
}

// This file is only included in newtab.html, after content.js has been loaded

import * as Messaging from "@src/lib/messaging"
import * as config from "@src/lib/config"
import { getPrettyTriVersion } from "@src/lib/webext"

// These functions work with the elements created by tridactyl/scripts/newtab.md.sh
function getChangelogDiv() {
    const changelogDiv = document.getElementById("changelog")
    if (!changelogDiv) throw new Error("Couldn't find changelog element!")
    return changelogDiv
}

function updateChangelogStatus() {
    const changelogDiv = getChangelogDiv()
    const changelogContent = changelogDiv.textContent
    if (
        browser.extension.inIncognitoContext ||
        localStorage.changelogContent === changelogContent
    ) {
        const changelogDetails = document.getElementById("changelog-details")
        if (!changelogDetails) {
            console.error("Couldn't find changelog details element!")
            return
        }
        changelogDetails.classList.add("seen")
    }
}

function readChangelog() {
    const changelogDiv = getChangelogDiv()
    localStorage.changelogContent = changelogDiv.textContent
    updateChangelogStatus()
}

window.addEventListener("load", updateChangelogStatus)
window.addEventListener("load", _ => {
    const changelogDetails =
        document.querySelector<HTMLDetailsElement>("#changelog-details")
    if (!changelogDetails) {
        console.error("Couldn't find changelog details element!")
        return
    }
    changelogDetails.addEventListener("toggle", () => {
        if (changelogDetails.open) readChangelog()
    })
})

// Periodically nag people about updates.
window.addEventListener("load", _ => {
    if (config.get("update", "nag") === true) {
        Messaging.message(
            "controller_background",
            "acceptExCmd",
            "updatecheck auto_polite",
        )
    }
})

document.getElementById(
    "tridactyl-version-number",
).textContent = getPrettyTriVersion()

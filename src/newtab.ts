// This file is only included in newtab.html, after content.js has been loaded

import * as Messaging from "./lib/messaging"
import * as config from "./lib/config"
import { getPrettyTriVersion } from "./lib/webext"

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
        const changelogButton = document.querySelector('input[id^="spoiler"]')
        if (!changelogButton) {
            console.error("Couldn't find changelog button!")
            return
        }
        changelogButton.classList.add("seen")
    }
}

function readChangelog() {
    const changelogDiv = getChangelogDiv()
    localStorage.changelogContent = changelogDiv.textContent
    updateChangelogStatus()
}

window.addEventListener("load", updateChangelogStatus)
window.addEventListener("load", _ => {
    const spoilerbutton = document.getElementById("spoilerbutton")
    if (!spoilerbutton) {
        console.error("Couldn't find spoiler button!")
        return
    }
    spoilerbutton.addEventListener("click", readChangelog)
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

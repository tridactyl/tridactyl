// This file is only included in newtab.html, after content.js has been loaded

// These functions work with the elements created by tridactyl/scripts/newtab.md.sh
function getChangelogDiv() {
    const changelogDiv = document.getElementById("changelog")
    if (!changelogDiv) throw new Error("Couldn't find changelog element!")
    return changelogDiv
}

function updateChangelogStatus() {
    const changelogDiv = getChangelogDiv()
    const changelogContent = changelogDiv.textContent
    if (localStorage["changelogContent"] == changelogContent) {
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
    localStorage["changelogContent"] = changelogDiv.textContent
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

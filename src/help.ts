// This file is only loaded in tridacyl's help pages

import * as config from "./config"

/** Created the element that should contain keybinding information */
function initTridactylSettingElem(
    elem: HTMLElement,
    kind: string,
): HTMLElement {
    let bindingNode = elem.getElementsByClassName(`Tridactyl${kind}`)[0]
    if (bindingNode) {
        Array.from(bindingNode.children)
            .filter(e => e.tagName == "LI")
            .forEach(e => e.parentNode.removeChild(e))
    } else {
        // Otherwise, create it
        bindingNode = document.createElement("ul")
        bindingNode.className = `TridactylSetting Tridactyl${kind}`
        bindingNode.textContent = kind + ": "
        elem.insertBefore(bindingNode, elem.children[2])
    }
    return bindingNode as HTMLElement
}

/** Returns an object that maps excmd names to excmd documentation element */
function getCommandElements() {
    return Array.from(
        document.querySelectorAll("section.tsd-panel-group:nth-child(3) h3"),
    ).reduce((all, elem) => {
        all[elem.textContent] = elem.parentElement
        return all
    }, {})
}

/** Updates the doc with aliases fetched from the config */
async function addSetting(settingName: string) {
    let commandElems = getCommandElements()
    // We're ignoring composite because it combines multiple excmds
    delete commandElems["composite"]

    // Initialize or reset the <ul> element that will contain settings in each commandElem
    let settingElems = Object.keys(commandElems).reduce(
        (settingElems, cmdName) => {
            settingElems[cmdName] = initTridactylSettingElem(
                commandElems[cmdName],
                settingName,
            )
            return settingElems
        },
        {},
    )

    let settings = await config.getAsync(settingName)
    // For each setting
    for (let setting in settings) {
        let excmd = settings[setting].split(" ")
        // How can we automatically detect what commands can be skipped?
        excmd = ["fillcmdline", "current_url"].includes(excmd[0])
            ? excmd[1]
            : excmd[0]
        // Find the corresponding setting
        while (settings[excmd]) {
            excmd = settings[excmd].split(" ")
            excmd = ["fillcmdline", "current_url"].includes(excmd[0])
                ? excmd[1]
                : excmd[0]
        }

        // If there is an HTML element for settings that correspond to the excmd we just found
        if (settingElems[excmd]) {
            let settingLi = document.createElement("li")
            settingLi.innerText = setting
            settingLi.title = settings[setting]
            // Add the setting to the element
            settingElems[excmd].appendChild(settingLi)
        }
    }

    // Remove all settingElems that do not have at least one setting
    Object.values(settingElems)
        .filter(
            (e: HTMLElement) =>
                !Array.from(e.children).find(c => c.tagName == "LI"),
        )
        .forEach((e: HTMLElement) => e.parentNode.removeChild(e))
}

browser.storage.onChanged.addListener((changes, areaname) => {
    if ("userconfig" in changes) {
        // JSON.stringify for comparisons like it's 2012
        ;["exaliases", "nmaps"].forEach(kind => {
            if (
                JSON.stringify(changes.userconfig.newValue[kind]) !=
                JSON.stringify(changes.userconfig.oldValue[kind])
            )
                addSetting(kind)
        })
    }
})

addEventListener("load", async () => {
    await addSetting("exaliases")
    await addSetting("nmaps")
    // setCommandSetting() can change the height of nodes in the page so we need to scroll to the right place again
    if (document.location.hash) {
        document.location.hash = document.location.hash
    }
})

// This file is only loaded in tridacyl's help pages

import * as config from "./config"

/** Creates the element that should contain alias information */
function initTridactylAliases(elem: HTMLElement) {
    let aliasNode = elem.getElementsByClassName("TridactylAliases")[0]
    // If the node already exists
    if (aliasNode) {
        // Empty it
        Array.from(aliasNode.children)
            .filter(e => e.tagName == "LI")
            .forEach(e => e.parentNode.removeChild(e))
    } else {
        // Otherwise, create it
        aliasNode = document.createElement("ul")
        aliasNode.className = "TridactylAliases"
        aliasNode.textContent = "Aliases: "
        elem.insertBefore(aliasNode, elem.children[2])
    }
    return aliasNode
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
async function setCommandAliases() {
    let commandElems = getCommandElements()
    // We're ignoring composite because it combines multiple excmds
    delete commandElems["composite"]

    // Initialize or reset the <ul> element that will contain aliases in each commandElem
    let aliasElems = Object.keys(commandElems).reduce((aliasElems, cmdName) => {
        aliasElems[cmdName] = initTridactylAliases(commandElems[cmdName])
        return aliasElems
    }, {})

    let aliases = await config.getAsync("exaliases")
    // For each alias
    for (let alias in aliases) {
        let excmd = aliases[alias].split(" ")[0]
        // Find the corresponding alias
        // We do this in a loop because aliases can be aliases for other aliases
        while (aliases[excmd]) excmd = aliases[excmd].split(" ")[0]

        // If there is an HTML element for aliases that correspond to the excmd we just found
        if (aliasElems[excmd]) {
            let aliasLi = document.createElement("li")
            aliasLi.innerText = alias
            aliasLi.title = aliases[alias]
            // Add the alias to the element
            aliasElems[excmd].appendChild(aliasLi)
        }
    }

    // Remove all aliasElems that do not have at least one alias
    Object.values(aliasElems)
        .filter(
            (e: HTMLElement) =>
                !Array.from(e.children).find(c => c.tagName == "LI"),
        )
        .forEach((e: HTMLElement) => e.parentNode.removeChild(e))
}

browser.storage.onChanged.addListener((changes, areaname) => {
    if ("userconfig" in changes) {
        // JSON.stringify for comparisons like it's 2012
        if (
            JSON.stringify(changes.userconfig.newValue.exaliases) !=
            JSON.stringify(changes.userconfig.oldValue.exaliases)
        )
            setCommandAliases()
    }
})

addEventListener("load", () => {
    setCommandAliases()
    // setCommandAliases() can change the height of nodes in the page so we need to scroll to the right place again
    document.location.href = document.location.href
})

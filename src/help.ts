// This file is only loaded in tridacyl's help pages

import * as config from "@src/lib/config"

/** Create the element that should contain keybinding information */
function initTridactylSettingElem(
    elem: HTMLElement,
    kind: string,
): HTMLElement {
    let bindingNode = elem.getElementsByClassName(`Tridactyl${kind}`)[0]
    if (bindingNode) {
        Array.from(bindingNode.children)
            .filter(e => e.tagName == "SPAN")
            .forEach(e => e.parentNode.removeChild(e))
    } else {
        // Otherwise, create it
        bindingNode = document.createElement("p")
        bindingNode.className = `TridactylSetting Tridactyl${kind}`
        bindingNode.textContent = kind + ": "
        elem.insertBefore(bindingNode, elem.children[2])
    }
    return bindingNode as HTMLElement
}

/** Return an object that maps excmd names to excmd documentation element */
function getCommandElements() {
    return Array.from(
        document.querySelectorAll(
            ".tsd-panel.tsd-member.tsd-kind-function.tsd-parent-kind-external-module",
        ),
    ).reduce((all, elem) => {
        let fnName = Array.from(elem.children).find(e => e.tagName == "H3")
        if (fnName) all[fnName.textContent] = elem
        return all
    }, {})
}

/** Update the doc with aliases fetched from the config */
async function addSetting(settingName: string) {
    let commandElems = getCommandElements()
    // We're ignoring composite because it combines multiple excmds
    delete commandElems["composite"]

    // Initialize or reset the <p> element that will contain settings in each commandElem
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
            let settingSpan = document.createElement("span")
            settingSpan.innerText = setting
            settingSpan.title = settings[setting]
            // Add the setting to the element
            settingElems[excmd].appendChild(settingSpan)
            settingElems[excmd].appendChild(document.createTextNode(" "))
        }
    }

    // Remove all settingElems that do not have at least one setting
    Object.values(settingElems)
        .filter(
            (e: HTMLElement) =>
                !Array.from(e.children).find(c => c.tagName == "SPAN"),
        )
        .forEach((e: HTMLElement) => e.parentNode.removeChild(e))
}

async function onExcmdPageLoad() {
    browser.storage.onChanged.addListener((changes, areaname) => {
        if ("userconfig" in changes) {
            // JSON.stringify for comparisons like it's 2012
            ;["nmaps", "imaps", "ignoremaps", "inputmaps", "exaliases"].forEach(
                kind => {
                    if (
                        JSON.stringify(changes.userconfig.newValue[kind]) !=
                        JSON.stringify(changes.userconfig.oldValue[kind])
                    )
                        addSetting(kind)
                },
            )
        }
    })

    await Promise.all(
        [
            "nmaps",
            "imaps",
            "ignoremaps",
            "inputmaps",
            "exaliases",
            "exmaps",
        ].map(addSetting),
    )
    // setCommandSetting() can change the height of nodes in the page so we need to scroll to the right place again
    if (document.location.hash) {
        document.location.hash = document.location.hash
    }
}

async function onSettingsPageLoad() {
    const inputClassName = " TridactylSettingInput "
    const inputClassNameModified =
        inputClassName + " TridactylSettingInputModified "

    let getIdForSetting = settingName => "TridactylSettingInput_" + settingName

    browser.storage.onChanged.addListener((changes, areaname) => {
        if (!("userconfig" in changes)) return
        Object.keys(changes.userconfig.newValue).forEach(key => {
            let elem = document.getElementById(
                getIdForSetting(key),
            ) as HTMLInputElement
            if (!elem) return
            elem.value = changes.userconfig.newValue[key]
            elem.className = inputClassName
        })
    })

    let onKeyUp = async ev => {
        let input = ev.target
        if (ev.key == "Enter") {
            ;(window as any).tri.messaging.message(
                "commandline_background",
                "recvExStr",
                ["set " + input.name + " " + input.value],
            )
        } else {
            if (input.value == (await config.getAsync(input.name.split(".")))) {
                input.className = inputClassName
            } else {
                input.className = inputClassNameModified
            }
        }
    }

    Promise.all(
        Array.from(document.querySelectorAll("a.tsd-anchor")).map(
            async (a: HTMLAnchorElement) => {
                let section = a.parentNode

                let settingName = a.name.split(".")
                let value = await config.getAsync(settingName)
                if (!value) return console.log("Failed to grab value of ", a)
                if (!["number", "boolean", "string"].includes(typeof value))
                    return console.log(
                        "Not embedding value of ",
                        a,
                        value,
                        " because not easily represented as string",
                    )

                let input = document.createElement("input")
                input.name = a.name
                input.value = value
                input.id = getIdForSetting(a.name)
                input.className = inputClassName
                input.addEventListener("keyup", onKeyUp)

                let div = document.createElement("div")
                div.appendChild(document.createTextNode("Current value:"))
                div.appendChild(input)

                section.appendChild(div)
            },
            // Adding elements expands sections so if the user wants to see a specific hash, we need to focus it again
        ),
    ).then(_ => {
        if (document.location.hash) {
            document.location.hash = document.location.hash
        }
    })
}

addEventListener(
    "load",
    (() => {
        switch (document.location.pathname) {
            case "/static/docs/modules/_src_excmds_.html":
                return onExcmdPageLoad
            case "/static/docs/classes/_src_lib_config_.default_config.html":
                return onSettingsPageLoad
        }
        return () => {}
    })(),
)

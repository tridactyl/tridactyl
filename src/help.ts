// This file is only loaded in tridacyl's help pages

import * as config from "@src/lib/config"
import { modeMaps } from "@src/lib/binding"

/** Create the element that should contain keybinding information */
function initTridactylSettingElem(
    elem: HTMLElement,
    kind: string,
): HTMLElement {
    let bindingNode = elem.getElementsByClassName(`Tridactyl${kind}`)[0]
    if (bindingNode) {
        Array.from(bindingNode.children)
            .filter(e => e.tagName === "SPAN")
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
        const fnName = Array.from(elem.children).find(e => e.tagName === "H3")
        if (fnName) all[fnName.textContent] = elem
        return all
    }, {})
}

/** Update the doc with aliases fetched from the config */
async function addSetting(settingName: string) {
    const commandElems = getCommandElements()
    // We're ignoring composite because it combines multiple excmds
    delete (commandElems as any).composite

    // Initialize or reset the <p> element that will contain settings in each commandElem
    const settingElems: { [key: string]: HTMLElement } = Object.keys(
        commandElems,
    ).reduce((settingElems, cmdName) => {
        settingElems[cmdName] = initTridactylSettingElem(
            commandElems[cmdName],
            settingName,
        )
        return settingElems
    }, {})

    const settings = await config.getAsyncDynamic(settingName)
    // For each setting
    for (const setting of Object.keys(settings)) {
        let excmd = settings[setting].split(" ")
        // How can we automatically detect what commands can be skipped?
        excmd = ["composite", "fillcmdline", "current_url"].includes(excmd[0])
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
            const settingSpan = document.createElement("span")
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
                !Array.from(e.children).find(c => c.tagName === "SPAN"),
        )
        .forEach((e: HTMLElement) => e.parentNode.removeChild(e))
}

async function onExcmdPageLoad() {
    browser.storage.onChanged.addListener((changes) => {
        if ("userconfig" in changes) {
            // JSON.stringify for comparisons like it's 2012
            ;[...modeMaps, "exaliases"].forEach(kind => {
                if (
                    JSON.stringify(changes.userconfig.newValue[kind]) !==
                    JSON.stringify(changes.userconfig.oldValue[kind])
                )
                    addSetting(kind)
            })
        }
    })

    await Promise.all([...modeMaps, "exaliases"].map(addSetting))
    // setCommandSetting() can change the height of nodes in the page so we need to scroll to the right place again
    if (document.location.hash) {
        /* tslint:disable:no-self-assignment */
        document.location.hash = document.location.hash
    }
}

function addSettingInputs() {
    const inputClassName = " TridactylSettingInput "
    const inputClassNameModified =
        inputClassName + " TridactylSettingInputModified "

    const onKeyUp = async ev => {
        const input = ev.target
        if (ev.key === "Enter") {
            ;(window as any).tri.messaging.message(
                "controller_background",
                "acceptExCmd",
                ["set " + input.name + " " + input.value],
            )
        } else {
            if (
                input.value === (await config.getAsync(input.name.split(".")))
            ) {
                input.className = inputClassName
            } else {
                input.className = inputClassNameModified
            }
        }
    }

    return Promise.all(
        Array.from(
            document.querySelectorAll<HTMLAnchorElement>("a.tsd-anchor"),
        ).map(
            async (a: HTMLAnchorElement) => {
                const section = a.parentNode

                const settingName = a.name.split(".")
                const value = await config.getAsyncDynamic(...settingName)
                if (!value) return console.log("Failed to grab value of ", a)
                if (!["number", "boolean", "string"].includes(typeof value))
                    return console.log(
                        "Not embedding value of ",
                        a,
                        value,
                        " because not easily represented as string",
                    )

                const input = document.createElement("input")
                input.name = a.name
                input.value = value
                input.id = "TridactylSettingInput_" + input.name
                input.className = inputClassName
                input.addEventListener("keyup", onKeyUp)

                const div = document.createElement("div")
                div.appendChild(document.createTextNode("Current value:"))
                div.appendChild(input)

                section.appendChild(div)

                config.addChangeListener(input.name as any, (_, newValue) => {
                    input.value = newValue
                    input.className = inputClassName
                })
            },
            // Adding elements expands sections so if the user wants to see a specific hash, we need to focus it again
        ),
    ).then(_ => {
        if (document.location.hash) {
            /* tslint:disable:no-self-assignment */
            document.location.hash = document.location.hash
        }
    })
}

function addResetConfigButton() {
    const button = document.createElement("button")
    button.innerText = "Reset Tridactyl config"
    button.style.margin = "auto 50%"
    button.style.minWidth = "200pt"
    button.addEventListener("click", () => {
        const sentence =
            "sanitise tridactylsync tridactyllocal tridactylhistory"
        const p = prompt(
            `Please write '${sentence}' without quotes in the following input field if you really want to reset your Tridactyl config.`,
        )
        if (p === sentence) {
            ;(window as any).tri.messaging
                .message("controller_background", "acceptExCmd", sentence)
                .then(_ => alert("Config reset!"))
        } else {
            alert(`Config not reset because '${p}' !== '${sentence}'`)
        }
    })
    document.querySelector("div.container.container-main").appendChild(button)
}

function onSettingsPageLoad() {
    addResetConfigButton()
    return addSettingInputs()
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

        // If we're on a different help page we don't need any side-effects
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        return () => {}
    })(),
)

import * as webext from "@src/lib/webext"
import * as messaging from "@src/lib/messaging"

type ScriptLocation =
    | "content"
    | "background"
    | "commandline"

function inCommandline() {
    return (document.activeElement as any).src === browser.extension.getURL("static/commandline.html")
}

function getScriptLocation(): ScriptLocation {
    const webext_context = webext.getContext()
    if (webext_context === "background") {
        return "background"
    }
    if (webext_context === "content") {
        if (inCommandline()) {
            return "commandline"
        } else {
            return "content"
        }
    }
}

export function forwardedToBackground(name: messaging.NonTabMessageType, cmds) {
    const location = getScriptLocation()
    if (location === "background") {
        messaging.addListener(name, messaging.attributeCaller(cmds))
    }

    return new Proxy(cmds, {
        get(target, property: string) {
            const excmd = target[property]
            if (excmd) {
                return (...args) => {
                    if (location === "background") {
                        return excmd(...args)
                    } else {
                        return messaging.message(name, property, args)
                    }
                }
            } else {
                return excmd
            }
        }
    })
}

export function forwardedToContent(name: messaging.TabMessageType, cmds) {
    const location = getScriptLocation()
    if (location === "content") {
        messaging.addListener(name, messaging.attributeCaller(cmds))
    }

    return new Proxy(cmds, {
        get(target, property: string) {
            const excmd = target[property]
            if (excmd) {
                return (...args) => {
                    if (location === "content") {
                        return excmd(...args)
                    } else if (location === "commandline") {
                        return messaging.messageOwnTab(name, property, args)
                    } else {
                        return messaging.messageActiveTab(name, property, args)
                    }
                }
            } else {
                return excmd
            }
        }
    })
}

import { messageAllTabs, messageActiveTab } from "./messaging"
import Logger from "./logging"
import * as config from "./config"

const logger = new Logger("messaging")

export async function updatetheme() {
    try {
        messageActiveTab("theming_content", "updatetheme")
    } catch (e) {
        logger.error("ERRRRRRRRRRRROOOOOOOO: FDPAAAA", e)
    }
}

export async function injectCssOnPage() {
    //browser.tabs.insertCSS(tabId, "themes/"+ theme + "content.css")
}

config.getAsync("theme").then(theme => {
    var t = theme
    //browser.storage.onChanged.addListener((changes, areaname) => {
    //    if (areaname === "local" &&
    //        "state" in changes){
    //        if (changes.state.oldValue != changes.state.newValue){
    //            var lastcmd = changes.state.
    //                newValue.cmdHistory.slice(-1)[0]
    //            if (lastcmd.includes("theme") && !lastcmd.includes(theme))
    //                updatetheme()
    //        }
    //    }
    //})
})

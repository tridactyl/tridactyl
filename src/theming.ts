import * as config from "./config"
import { toggleStylesheet } from "./css_util"

export function updatetheme() {
    updateCmlTheme()
    updateContentTheme()

    //and all other theme related things
    //...
}

async function updateCmlTheme() {
    var theme = config.get("theme")
    var doc = document.getElementById("cmdl_iframe")
}

async function updateContentTheme() {}

import * as Messaging from "./messaging"
import * as SELF from "./theming"
Messaging.addListener("theming_content", Messaging.attributeCaller(SELF))

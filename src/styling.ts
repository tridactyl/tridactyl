import { staticThemes } from "./.metadata.generated"
import * as config from "./config"
import * as Logging from "./logging"

const logger = new Logging.Logger("styling")

export const THEMES = staticThemes

function capitalise(str) {
    if (str === "") return str
    return str[0].toUpperCase() + str.slice(1)
}

function prefixTheme(name) {
    return "TridactylTheme" + capitalise(name)
}

// At the moment elements are only ever `:root` and so this array and stuff is all a bit overdesigned.
const THEMED_ELEMENTS = []

export async function theme(element) {
    // Remove any old theme
    for (let theme of THEMES.map(prefixTheme)) {
        element.classList.remove(theme)
    }

    let newTheme = await config.getAsync("theme")

    // Add a class corresponding to config.get('theme')
    if (newTheme !== "default") {
        element.classList.add(prefixTheme(newTheme))
    }

    // Record for re-theming
    // considering only elements :root (page and cmdline_iframe)
    // TODO:
    //     - Find ways to check if element is already pushed
    if (
        THEMED_ELEMENTS.length < 2 &&
        element.tagName.toUpperCase() === "HTML"
    ) {
        THEMED_ELEMENTS.push(element)
    }
}

function retheme() {
    THEMED_ELEMENTS.forEach(element => {
        try {
            theme(element)
        } catch (e) {
            logger.warning(
                `Failed to retheme element "${element}". Error: ${e}`,
            )
        }
    })
}

// Hacky listener
browser.storage.onChanged.addListener((changes, areaname) => {
    if ("userconfig" in changes) {
        retheme()
    }
})

// Sometimes pages will overwrite class names of elements. We use a MutationObserver to make sure that the HTML element always has a TridactylTheme class
// We can't just call theme() because it would first try to remove class names from the element, which would trigger the MutationObserver before we had a chance to add the theme class and thus cause infinite recursion
let cb = async mutationList => {
    let theme = await config.getAsync("theme")
    mutationList
        .filter(m => m.target.className.search(prefixTheme("")) == -1)
        .forEach(m => m.target.classList.add(prefixTheme(theme)))
}

new MutationObserver(cb).observe(document.documentElement, {
    attributes: true,
    childList: false,
    characterData: false,
    subtree: false,
    attributeOldValue: false,
    attributeFilter: ["class"],
})

import * as config from "./config"
import * as Logging from "./logging"

const logger = new Logging.Logger("styling")

// find a way of getting theme list without hard-coding it
// using a macro might be an option
const THEMES = ["dark", "greenmat"]
let currentTheme = config.get("styling")

function capitalise(str) {
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
    if (newTheme !== "default" && newTheme !== currentTheme) {
        element.classList.add(prefixTheme(newTheme))
        currentTheme = newTheme
    }

    // Load the required stylesheet if it's not loaded already
    // No-op

    // Record for re-theming
    THEMED_ELEMENTS.push(element)
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
browser.storage.onChanged.addListener(changes => {
    if ("userconfig" in changes) {
        retheme()
    }
})

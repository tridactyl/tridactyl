import { staticThemes } from "@src/.metadata.generated"
import * as config from "@src/lib/config"
import * as Logging from "@src/lib/logging"
import { browserBg, ownTab, ownTabId } from "@src/lib/webext"

const logger = new Logging.Logger("styling")

const isMozExtension = window.location.protocol === "moz-extension:"

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

let insertedHintElemCSS = false
const hintElemCss = {
    allFrames: true,
    matchAboutBlank: true,
    code: "",
}

let insertedCSS = false
const customCss = {
    allFrames: true,
    matchAboutBlank: true,
    code: "",
}

type ThemeColors = NonNullable<browser._manifest.ThemeType["colors"]>
function applyBrowserTheme(element, c: ThemeColors = {}) {
    const background =
        c.toolbar_field_focus || c.toolbar_field || c.toolbar || c.frame
    const foreground =
        c.toolbar_field_text_focus ||
        c.toolbar_field_text ||
        c.toolbar_text ||
        c.bookmark_text ||
        c.tab_background_text
    const selected = c.popup_highlight || c.tab_line
    const set = (property, color) => {
        const value = Array.isArray(color)
            ? `${color.length === 4 ? "rgba" : "rgb"}(${color})`
            : color
        if (value && CSS.supports("color", value))
            element.style.setProperty(`--tridactyl-${property}`, value)
        else element.style.removeProperty(`--tridactyl-${property}`)
    }
    set("cmdl-bg", background)
    set("cmdl-fg", foreground)
    set("cmplt-bg", c.popup || background)
    set("cmplt-fg", c.popup_text || foreground)
    set("of-bg", selected)
    set("of-fg", c.popup_highlight_text || foreground)
    set("search-highlight-color", c.toolbar_field_highlight || selected)
}

async function syncBrowserTheme(element) {
    const colors = ["default", "auto"].includes(await config.getAsync("theme"))
        ? (await browserBg.theme.getCurrent((await ownTab()).windowId)).colors
        : undefined
    applyBrowserTheme(element, colors || {})
}

export async function theme(element) {
    if (!THEMED_ELEMENTS.includes(element)) THEMED_ELEMENTS.push(element)
    // Remove any old theme

    /**
     * DEPRECATED
     *
     * You don't need to add weird classnames to your themes any more, but you can if you want.
     *
     * Retained for backwards compatibility.
     **/
    for (const theme of THEMES.map(prefixTheme)) {
        element.classList.remove(theme)
    }
    // DEPRECATION ENDS

    // Insert hint CSS rules according to config - copying how themes are inserted
    if (isMozExtension) {
        const oldHintStyle = document.getElementById("tridactyl-hint-style")
        if (oldHintStyle) oldHintStyle.remove()
    } else if (insertedHintElemCSS) {
        await browserBg.tabs.removeCSS(await ownTabId(), hintElemCss)
        insertedHintElemCSS = false
    }

    const hintElemOptions = await config.getAsync("hintstyles")

    // Allow for different hint text colours if using overlays (can help visibility issues)
    const hintFgVar =
        hintElemOptions.overlay === "all"
            ? "--tridactyl-hint-highlight-fg"
            : "--tridactyl-hint-fg"
    const activeFgVar =
        hintElemOptions.overlay === "all"
            ? "--tridactyl-hint-highlight-active-fg"
            : "--tridactyl-hint-active-fg"

    const hintElemRules =
        (hintElemOptions.fg === "all"
            ? `    color: var(${hintFgVar}) !important;\n`
            : "") +
        (hintElemOptions.bg === "all"
            ? "    background: var(--tridactyl-hint-bg) !important;\n"
            : "") +
        (hintElemOptions.outline === "all"
            ? "    outline: var(--tridactyl-hint-outline) !important;\n"
            : "")

    const activeElemRules =
        (hintElemOptions.fg !== "none"
            ? `    color: var(${activeFgVar}) !important;\n`
            : "") +
        (hintElemOptions.bg !== "none"
            ? "    background: var(--tridactyl-hint-active-bg) !important;\n"
            : "") +
        (hintElemOptions.outline !== "none"
            ? "    outline: var(--tridactyl-hint-active-outline) !important;\n"
            : "")

    // If these are set to "none" they won't be added to the page at all so only need to handle active
    const activeOverlayRules =
        (hintElemOptions.overlay === "active"
            ? ".TridactylHintHighlight { display:none; } .TridactylHintHighlightActive { display: block !important; }"
            : "") +
        (hintElemOptions.overlayoutline === "active"
            ? ".TridactylHintOutline { display:none; } .TridactylHintOutlineActive { display: block !important; }"
            : "")

    hintElemCss.code =
        (hintElemRules !== ""
            ? ".TridactylHintElem {\n" + hintElemRules + "}\n"
            : "") +
        (activeElemRules !== ""
            ? ".TridactylHintActive {\n" + activeElemRules + "}\n"
            : "") +
        activeOverlayRules

    if (isMozExtension) {
        if (hintElemCss.code !== "") {
            const style = document.createElement("style")
            style.id = "tridactyl-hint-style"
            style.textContent = hintElemCss.code
            document.head.appendChild(style)
        }
    } else if (hintElemCss.code !== "") {
        await browserBg.tabs.insertCSS(await ownTabId(), hintElemCss)
        insertedHintElemCSS = true
    }

    if (isMozExtension) {
        const oldThemeStyle = document.getElementById("tridactyl-theme-style")
        if (oldThemeStyle) oldThemeStyle.remove()
    } else if (insertedCSS) {
        // Typescript doesn't seem to be aware than remove/insertCSS's tabid
        // argument is optional
        await browserBg.tabs.removeCSS(await ownTabId(), customCss)
        insertedCSS = false
    }

    const newTheme = await config.getAsync("theme")

    /**
     * DEPRECATED
     *
     * You don't need to add weird classnames to your themes any more, but you can if you want.
     *
     * Retained for backwards compatibility.
     **/
    if (newTheme !== "default") {
        element.classList.add(prefixTheme(newTheme))
    }
    // DEPRECATION ENDS

    // Insert custom css if needed
    if (newTheme !== "default") {
        customCss.code = THEMES.includes(newTheme)
            ? "@import url('" +
              browser.runtime.getURL(
                  "static/themes/" + newTheme + "/" + newTheme + ".css",
              ) +
              "');"
            : await config.getAsync("customthemes", newTheme)
        if (customCss.code) {
            if (isMozExtension) {
                const style = document.createElement("style")
                style.id = "tridactyl-theme-style"
                style.textContent = customCss.code
                document.head.appendChild(style)
            } else {
                await browserBg.tabs.insertCSS(await ownTabId(), customCss)
                insertedCSS = true
            }
        } else {
            logger.error("Theme " + newTheme + " couldn't be found.")
        }
    }

    await syncBrowserTheme(element)
}

export const updateBrowserTheme = () =>
    Promise.all(THEMED_ELEMENTS.map(syncBrowserTheme))

if (isMozExtension) browser.theme.onUpdated.addListener(updateBrowserTheme)

function retheme() {
    THEMED_ELEMENTS.forEach(element => {
        theme(element).catch(e => {
            logger.warning(
                `Failed to retheme element "${element}". Error: ${e}`,
            )
        })
    })
}

config.addChangeListener("theme", retheme)
config.addChangeListener("hintstyles", retheme)

/**
 * DEPRECATED
 *
 * You don't need to add weird classnames to your themes any more, but you can if you want.
 *
 * Retained for backwards compatibility.
 **/
// Sometimes pages will overwrite class names of elements. We use a MutationObserver to make sure that the HTML element always has a TridactylTheme class
// We can't just call theme() because it would first try to remove class names from the element, which would trigger the MutationObserver before we had a chance to add the theme class and thus cause infinite recursion
const cb = async mutationList => {
    const theme = await config.getAsync("theme")
    mutationList
        .filter(m => m.target.className.search(prefixTheme("")) === -1)
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
// DEPRECATION ENDS

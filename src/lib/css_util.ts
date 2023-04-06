/* eslint-disable dot-notation, @typescript-eslint/dot-notation */
import * as CSS from "css"

// Layout (of bits we care about:
// {stylesheet: {
//          rules: [{
//                      type: "rule", selectors: [string], declarations: [
//                          {type: "declaration", property: string, value: string}

/** Find rules in sheet that match selector */
export function findCssRules(
    selectors: string[],
    sheet: CSS.Stylesheet,
): number[] {
    const filtSheet = [...sheet.stylesheet.rules.entries()].filter(x => {
        const rule = x[1]
        return (
            rule.type === "rule" &&
            "selectors" in rule &&
            // Make sure that there are as many selectors in the current rule
            // as there are in the rule we're looking for
            rule.selectors.length === selectors.length &&
            // Also make sure that each of the selectors of the current rule
            // are present in the rule we're looking for
            !rule.selectors.find(selector => !selectors.includes(selector))
        )
    })
    return filtSheet.map(x => x[0])
}

/** Rulename -> { name: <selector>, options: { <option-name>: <css-string> } }
 *
 *  Multi-level map of rulename, options available for rule and css for each option.
 *
 *  *findCssRules and changeSingleCss rely on the selector not containing a comma.*
 *
 *  TODO: make this more flexible with cleverer matching of selectors, merging of options
 *
 */
export const potentialRules = {
    statuspanel: {
        name: `#statuspanel`,
        options: {
            none: `display: none !important;`,
            right: `right: 0; display: inline;`,
            left: ``,
            "top-left": `top: 2em; z-index: 2; display: inline;`,
            "top-right": `top: 2em; z-index: 2; right: 0; display: inline;`,
        },
    },
    hoverlink: {
        name: `statuspanel[type="overLink"], #statuspanel[type="overLink"]`,
        options: {
            none: `display: none !important;`,
            right: `right: 0; display: inline;`,
            left: ``,
            "top-left": `top: 2em; z-index: 2; display: inline;`,
            "top-right": `top: 2em; z-index: 2; right: 0; display: inline;`,
        },
    },
    tabstoolbar: {
        name: `#TabsToolbar`,
        options: {
            none: `visibility: collapse;`,
            show: ``,
        },
    },
    tabstoolbarunfocused: {
        name: `:root:not([customizing]) #navigator-toolbox:not(:hover):not(:focus-within) #TabsToolbar`,
        options: {
            hide: `visibility: collapse;`,
            show: ``,
        },
    },
    tabcounter: {
        name: `tabs`,
        options: {
            off: ``,
            on: `counter-reset: tab-counter;`,
        },
    },
    tabcounters: {
        name: `.tab-label::before`,
        options: {
            hide: ``,
            show: ` counter-increment: tab-counter;
                    content: counter(tab-counter) " - ";`,
        },
    },
    navtoolboxunfocused: {
        name: `:root:not([customizing]) #navigator-toolbox:not(:hover):not(:focus-within)`,
        options: {
            hide: `max-height: 1px; min-height: calc(0px); overflow: hidden;`,
            show: ``,
        },
    },
    navbarunfocused: {
        name: `:root:not([customizing]) #navigator-toolbox:not(:hover):not(:focus-within) #nav-bar`,
        // tridactyl auto show zone doesn't seem to make a difference
        options: {
            hide: `max-height: 0;
                    min-height: 0!important;
                    --tridactyl-auto-show-zone: 10px;
                    margin-bottom: calc(-1 * var(--tridactyl-auto-show-zone));
                    opacity: 0;`,
            show: ``,
        },
    },
    // Annoying black line at top in fullscreen
    navbarafter: {
        name: `#navigator-toolbox::after`,
        options: {
            hide: `display: none !important;`,
            show: ``,
        },
    },
    // All children except add-on panels
    navbarnonaddonchildren: {
        name: `:root:not([customizing]) #nav-bar > :not(#customizationui-widget-panel)`,
        options: {
            hide: `display: none !important;`,
            show: ``,
        },
    },
    // Set navbar height to 0
    navbarnoheight: {
        name: `:root:not([customizing]) #nav-bar`,
        options: {
            hide: ``,
            show: `max-height: 0; min-height: 0 !important;`,
        },
    },
    // This inherits transparency if we aren't careful
    menubar: {
        name: `#navigator-toolbox:not(:hover):not(:focus-within) #toolbar-menubar > *`,
        options: {
            grey: `background-color: rgb(232, 232, 231);`,
            default: ``,
        },
    },
    // Window dectorations
    titlebar: {
        name: `#titlebar`,
        options: {
            hide: `display: none !important;`,
            show: ``,
        },
    },
    padwhenmaximised: {
        name: `#main-window[sizemode="maximized"] #content-deck`,
        options: {
            some: `padding-top: 8px;`,
            none: ``,
        },
    },
}

//  Vimperator's options for reference:
//  <tags>'go' 'guioptions'</tags>
//  <spec>'guioptions' 'go'</spec>

//
//  m          Menubar
//  T          Toolbar
//  B          Bookmark bar
//  A          Add-on bar
//  n          Tab number
//  b          Bottom scrollbar
//  r          Right scrollbar
//  l          Left scrollbar
//
//  was just a simple show/hide if the characters appeared in the setting

/** Rules that index into potentialRules or metaRules
 *
 *  Please don't add cycles to this table :)
 */
export const metaRules = {
    gui: {
        none: {
            hoverlink: "none",
            tabs: "none",
            navbar: "autohide",
            menubar: "grey",
            padwhenmaximised: "some",
        },
        full: {
            hoverlink: "left",
            tabs: "always",
            navbar: "always",
            menubar: "default",
            padwhenmaximised: "none",
        },
    },
    tabs: {
        none: {
            tabstoolbar: "none",
            navtoolboxunfocused: "hide",
        },
        always: {
            tabstoolbar: "show",
            tabstoolbarunfocused: "show",
            navtoolboxunfocused: "show",
        },
        autohide: {
            tabstoolbar: "show",
            tabstoolbarunfocused: "hide",
            navtoolboxunfocused: "hide",
        },
        count: {
            tabcounter: "on",
            tabcounters: "show",
        },
        nocount: {
            tabcounter: "off",
            tabcounters: "hide",
        },
    },
    navbar: {
        autohide: {
            navbarunfocused: "hide",
            navtoolboxunfocused: "hide",
            navbarafter: "hide",
            navbarnonaddonchildren: "show",
            navbarnoheight: "hide",
        },
        always: {
            navbarunfocused: "show",
            navtoolboxunfocused: "show",
            navbarafter: "show",
            navbarnonaddonchildren: "show",
            navbarnoheight: "hide",
        },
        none: {
            navbarunfocused: "show",
            navtoolboxunfocused: "show",
            navbarafter: "hide",
            navbarnonaddonchildren: "hide",
            navbarnoheight: "show",
        },
    },
}

/** Add desired non-meta rule to stylesheet replacing existing rule with the same selector if present */
export function changeSingleCss(
    rulename: string,
    optionname: string,
    sheet: CSS.Stylesheet,
): CSS.Stylesheet {
    const selector = potentialRules[rulename].name
    const newRule = `${selector} {
        ${potentialRules[rulename].options[optionname]}
    }`
    const miniSheet = CSS.parse(newRule).stylesheet.rules[0]

    // Find pre-existing rules
    const oldRuleIndexes = findCssRules(
        "selectors" in miniSheet ? miniSheet.selectors : [],
        sheet,
    )
    if (oldRuleIndexes.length > 0) {
        sheet.stylesheet.rules[oldRuleIndexes[0]] = miniSheet
    } else {
        sheet.stylesheet.rules = sheet.stylesheet.rules.concat(miniSheet)
    }

    return sheet
}

/** Apply rule to stylesheet. rulename, optionname identify a rule. They may be meta rules */
export function changeCss(
    rulename: string,
    optionname: string,
    sheet: CSS.Stylesheet,
): CSS.Stylesheet {
    if (rulename in metaRules) {
        const metarule = metaRules[rulename][optionname]
        for (const rule of Object.keys(metarule)) {
            // have a metarule call itself for hours of fun
            sheet = changeCss(rule, metarule[rule], sheet)
        }
    } else sheet = changeSingleCss(rulename, optionname, sheet)
    return sheet
}

import * as CSS from "css"

// Layout (of bits we care about:
// {stylesheet: {
//          rules: [{
//                      type: "rule", selectors: [string], declarations: [
//                          {type: "declaration", property: string, value: string}

export function findCssRules(
    ruleToFind: string,
    sheet: CSS.Stylesheet,
): number[] {
    const filtSheet = [...sheet.stylesheet.rules.entries()].filter(x => {
        const rule = x[1]
        return (
            rule.type == "rule" &&
            rule["selectors"].filter(sel => sel == ruleToFind).length > 0
        )
    })
    return filtSheet.map(x => x[0])
}

// TODO: make this more flexible with cleverer matching of selectors, merging of options
export const potentialRules = {
    hoverlink: {
        name: `statuspanel[type="overLink"]`,
        options: {
            none: `display: none !important;`,
            right: `right: 0; display: inline;`,
            left: ``,
            "top-left": `top: 2em; display: inline;`,
            "top-right": `top: 2em; right: 0; display: inline;`,
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
    navtoolboxunfocused: {
        name: `:root:not([customizing]) #navigator-toolbox:not(:hover):not(:focus-within)`,
        options: {
            hide: `max-height: 0; min-height: calc(0px);`,
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

export const metaRules = {
    gui: {
        none: {
            hoverlink: "none",
            tabs: "none",
            navbar: "autohide",
            titlebar: "hide",
            menubar: "grey",
        },
        full: {
            hoverlink: "left",
            tabs: "always",
            navbar: "always",
            titlebar: "show",
            menubar: "default",
        },
    },
    tabs: {
        none: {
            tabstoolbar: "none",
        },
        always: {
            tabstoolbar: "show",
            tabstoolbarunfocused: "show",
        },
        autohide: {
            tabstoolbar: "show",
            tabstoolbarunfocused: "hide",
        },
    },
    navbar: {
        autohide: {
            navbarunfocused: "hide",
            navtoolboxunfocused: "hide",
            navbarafter: "hide",
        },
        always: {
            navbarunfocused: "show",
            navtoolboxunfocused: "show",
            navbarafter: "show",
        },
    },
}

export function changeSingleCss(
    rulename: string,
    optionname: string,
    sheet: CSS.Stylesheet,
): CSS.Stylesheet {
    const ruleInds = findCssRules(potentialRules[rulename]["name"], sheet)
    const desRule =
        potentialRules[rulename]["name"] +
        " {" +
        potentialRules[rulename]["options"][optionname] +
        "}"
    const miniSheet = CSS.parse(desRule).stylesheet.rules[0]
    if (ruleInds.length > 0) {
        sheet.stylesheet.rules[ruleInds[0]] = miniSheet
    } else {
        sheet.stylesheet.rules = sheet.stylesheet.rules.concat(miniSheet)
    }
    return sheet
}

export function changeCss(
    rulename: string,
    optionname: string,
    sheet: CSS.Stylesheet,
): CSS.Stylesheet {
    if (rulename in metaRules) {
        for (let rule of Object.keys(metaRules[rulename][optionname])) {
            // have a metarule call itself for hours of fun
            sheet = changeCss(
                rule,
                metaRules[rulename][optionname][rule],
                sheet,
            )
        }
    } else sheet = changeSingleCss(rulename, optionname, sheet)
    return sheet
}

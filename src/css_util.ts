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
    tabs: {
        name: `#TabsToolbar`,
        options: {
            none: `visibility: collapse;`,
            show: ``,
        },
    },
}

export function changeCss(
    rulename: string,
    optionname: string,
    sheet: CSS.Stylesheet,
): CSS.Stylesheet {
    const ruleInds = findCssRules(potentialRules[rulename]["name"], sheet)
    console.log(ruleInds)
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

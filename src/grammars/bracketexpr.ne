@preprocessor typescript

BracketExpr -> "<" Modifier ModKey ">" {% bexpr=>bexpr.slice(1,-1) %}
             | "<" Key ">" {% bexpr=>[{}].concat(bexpr.slice(1,-1)) %}
Modifier -> [acmsACMS]:? [acmsACMS]:? [acmsACMS]:? [acmsACMS]:? "-" {%
    /** For each modifier present,
        add its long name as an attribute set to true to an object */
    (mods, _, reject) => {
        const longNames = new Map([
            ["A", "altKey"],
            ["C", "ctrlKey"],
            ["M", "metaKey"],
            ["S", "shiftKey"],
        ])

        let modifiersObj = {}
        for (let mod of mods) {
            if (mod === null || mod === "-") continue
            let longName = longNames.get(mod.toUpperCase())
            if (longName) {
                // Reject if the same name is used twice.
                if (longName in modifiersObj) return reject
                else modifiersObj[longName] = true
            }
        }
        return modifiersObj
    }
    %}
# <>- permitted with modifiers, but not otherwise.
ModKey -> "<" {% id %}
        | ">" {% id %}
        | "-" {% id %}
        | Key {% id %}
Key -> [^\s<>-]:+ {% (key)=>key[0].join("") %}

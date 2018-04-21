#!/usr/bin/env python3

# need to merge this into main native file
import tinycss2
# only want to import this if CSS fiddling is called

# need to figure out how to find this
USER_PROFILE = ""
# need to make chrome folder if it doesn't exist
chromefile = USER_PROFILE + "/chrome/userChrome.css"
# Should probably put in absolutely minimal css (so just namespace?) if it doesn't exist

cssString = ""
with open(chromefile, "r") as file:
    cssString = file.read()

RULES = tinycss2.parse_stylesheet(cssString)

# Get the relevant rules
def getrules(filt):
    return [(i,RULES[i]) for (i,r) in enumerate(RULES) if (
        isinstance(r,tinycss2.ast.QualifiedRule)
        and filt == tinycss2.serialize(r.prelude)
        # Consider swapping this for in? don't want to care about e.g. " or '
    )]

# Can we potentially store this in JS? Otherwise it will be very hard to document.
# Also, what do we do about meta rules that include other rules, e.g gui=none?
potentialRules = {
    "hoverlink":  {
        "name": """statuspanel[type="overLink"]""",
        "options": {
            "none": """display: none !important;""",
            "right": """right: 0; display: inline;""",
        }
    }
}

def changerule(rulename,optionname):
    try:
        RULES[
            getrules(potential_rules[rulename]["name"])[1][0]
        ].content = tinycss2.parse_component_value_list(
            potential_rules[rulename]["options"][optionname]
        )
    # If we can't find the rule we want, make a new one
    except IndexError:
        RULES.append(
            tinycss2.parse_one_rule(
                potential_rules[rulename]["name"] + "{" + potential_rules[rulename]["options"][optionname] + "}"
            )
        )

# Change the rules they asked for
# changerule("hoverlink","right")

# Make a backup
with open(chromefile + ".tri.bak", "w") as file:
    file.write(cssString)

# Write the CSS file
with open(chromefile,"w") as file:
    file.write(tinycss2.serialize(RULES))

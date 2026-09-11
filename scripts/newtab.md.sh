#!/bin/sh

# Combine newtab markdown and template

if ! cd src/static ; then
    echo "Failed to cd in src/static. Aborting."
    exit
fi

newtab="../../generated/static/newtab.html"
newtabtemp="../../generated/static/newtab.temp.html"

sed "/REPLACETHIS/,$ d" newtab.template.html > "$newtabtemp"
"$(yarn bin)/marked" newtab.md >> "$newtabtemp"
sed "1,/REPLACETHIS/ d" newtab.template.html >> "$newtabtemp"

# Why think when you can pattern match?

(
sed "/REPLACE_ME_WITH_THE_CHANGE_LOG_USING_SED/,$ d" "$newtabtemp"
# Note: If you're going to change this HTML, make sure you don't break the JS in src/newtab.ts
cat <<EOF
<details id="changelog-details">
<summary><span id="nagbar-changelog">New features!</span>Changelog</summary>
<div id="changelog" class="spoiler">
EOF
"$(yarn bin)/marked" ../../CHANGELOG.md
echo """
</div>
</details>
"""
sed "1,/REPLACE_ME_WITH_THE_CHANGE_LOG_USING_SED/ d" "$newtabtemp"
) > "$newtab"

rm "$newtabtemp"

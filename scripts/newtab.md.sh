#!/bin/sh

# Combine newtab markdown and template

cd src/static

newtab="../../generated/static/newtab.html"
newtabtemp="../../generated/static/newtab.temp.html"

sed "/REPLACETHIS/,$ d" newtab.template.html > "$newtabtemp"
$(npm bin)/marked newtab.md >> "$newtabtemp"
sed "1,/REPLACETHIS/ d" newtab.template.html >> "$newtabtemp"

# Why think when you can pattern match?

sed "/REPLACE_ME_WITH_THE_CHANGE_LOG_USING_SED/,$ d" "$newtabtemp" > "$newtab"
# Note: If you're going to change this HTML, make sure you don't break the JS in src/newtab.ts
echo """
<input type="checkbox"  id="spoilerbutton" />
<label for="spoilerbutton" onclick=""><div id="nagbar-changelog">New features!</div>Changelog</label>
<div id="changelog" class="spoiler">
""" >> "$newtab"
$(npm bin)/marked ../../CHANGELOG.md >> "$newtab"
echo """
</div>
""" >> "$newtab"
sed "1,/REPLACE_ME_WITH_THE_CHANGE_LOG_USING_SED/ d" "$newtabtemp" >> "$newtab"

rm "$newtabtemp"

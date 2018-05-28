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
echo """
<input type="checkbox"  id="spoilerbutton" />
<label for="spoilerbutton" onclick="">Changelog</label>
<div class="spoiler">
""" >> "$newtab"
$(npm bin)/marked ../../CHANGELOG.md >> "$newtab"
echo """
</div>
""" >> "$newtab"
sed "1,/REPLACE_ME_WITH_THE_CHANGE_LOG_USING_SED/ d" "$newtabtemp" >> "$newtab"

rm "$newtabtemp"

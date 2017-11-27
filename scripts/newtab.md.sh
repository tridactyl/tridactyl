#!/bin/sh

# Combine newtab markdown and template

cd src/static

newtab="../../generated/static/newtab.html"

sed "/REPLACETHIS/,$ d" newtab.template.html > "$newtab"
marked newtab.md >> "$newtab"
sed "1,/REPLACETHIS/ d" newtab.template.html >> "$newtab"

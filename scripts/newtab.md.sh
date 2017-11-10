#!/bin/sh

# Combine newtab markdown and template

cd src/static
sed "/REPLACETHIS/s/REPLACETHIS/marked newtab.md/e" newtab.template.html > ../../generated/static/newtab.html

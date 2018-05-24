#!/usr/bin/env bash
cd src/static

authors="../../build/static/authors.html"

sed "/REPLACETHIS/,$ d" authors.html > "$authors"
git shortlog -sn | cut -c8- | sed 's/^/<p>/' | sed 's/$/<\/p>/' >> "$authors"
sed "1,/REPLACETHIS/ d" authors.html >> "$authors"

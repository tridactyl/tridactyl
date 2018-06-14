#!/usr/bin/env bash

set -e
err() { echo "error: line $(caller)"; }
trap err ERR

cd src/static

authors="../../build/static/authors.html"

sed "/REPLACETHIS/,$ d" authors.html > "$authors"
git shortlog -sn HEAD | cut -c8- | sed 's/^/<p>/' | sed 's/$/<\/p>/' >> "$authors"
sed "1,/REPLACETHIS/ d" authors.html >> "$authors"

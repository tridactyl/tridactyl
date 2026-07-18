#!/usr/bin/env bash

set -e
err() { echo "error: line $(caller)"; }
trap err ERR

mkdir -p .build_cache
cd src/static

authors="../../build/static/authors.html"

sed "/REPLACETHIS/,$ d" authors.html > "$authors"

# If we're in a git repo, refresh the cache
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git shortlog -sn HEAD | cut -c8- | awk '!seen[$0]++' | sed 's/^/<p>/' | sed 's/$/<\/p>/' > ../../.build_cache/authors
fi

cat ../../.build_cache/authors >> "$authors"

sed "1,/REPLACETHIS/ d" authors.html >> "$authors"

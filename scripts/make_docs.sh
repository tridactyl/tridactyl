#!/bin/sh
set -e

dest=generated/static/docs
"$(yarn bin)/typedoc" --plugin ./scripts/typedoc-theme.js --theme tridactyl \
    --entryPointStrategy expand --exclude "src/**/?(test_utils|*.test).ts" \
    --out "$dest" src
rm -rf build/static/docs
cp -r "$dest" build/static/

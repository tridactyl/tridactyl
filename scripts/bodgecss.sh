#!/usr/bin/env bash

imports=$(find src/static/themes/ -name '*.css'| awk -F"/" '{ printf "@import url('\''../%s/%s/%s'\'');\n", $3, $4, $5 }')

shopt -s globstar

for css in $(ls build/static/css/**/*.css); do
    printf '%s\n%s\n' "$imports" "$(cat $css)" > $css
done

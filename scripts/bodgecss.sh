#!/usr/bin/env bash

imports=$(find src/static/themes/ -name '*.css'| sed "s/^src\/static\///" | sed "s/^.*$/@import url\('..\/\0'\);/")

shopt -s globstar

for css in $(ls build/static/css/**/*.css); do
    printf '%s\n%s\n' "$imports" "$(cat $css)" > $css
done

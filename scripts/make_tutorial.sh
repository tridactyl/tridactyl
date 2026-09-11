#!/bin/sh

# Combine tutorial markdown and template

if ! cd src/static/clippy; then
    echo "Failed to cd in src/static/clippy. Aborting."
    exit
fi

pages=$(ls ./*.md)
dest="../../../generated/static/clippy/"

for page in $pages
do
    fileroot=$(echo "$page" | cut -d'.' -f-2)
    sed -e "s|href=\"$fileroot.html\"|aria-current=\"page\" &|" \
        -e "/REPLACETHIS/,$ d" tutor.template.html > "$dest$fileroot.html"
    "$(yarn bin)/marked" "$page" >> "$dest$fileroot.html"
    sed "1,/REPLACETHIS/ d" tutor.template.html >> "$dest$fileroot.html"
    sed -i.bak "s|\(href=['\"]\./[^'\"]*\)\.md\(['\"]\)|\1.html\2|g" "$dest$fileroot.html"
done

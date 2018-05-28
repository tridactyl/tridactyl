#!/bin/sh

# Combine tutorial markdown and template

cd src/static/clippy

pages=$(ls *.md)
dest="../../../generated/static/clippy/"

for page in $pages
do
    fileroot=$(echo $page | cut -d'.' -f-1)
    sed "/REPLACETHIS/,$ d" tutor.template.html > "$dest$fileroot.html"
    $(npm bin)/marked $page >> "$dest$fileroot.html"
    sed "1,/REPLACETHIS/ d" tutor.template.html >> "$dest$fileroot.html"
done

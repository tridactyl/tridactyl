#!/usr/bin/env bash

gitversion=$(git describe --tags | cut -d"-" -f2-)
manversion=$(grep '"version":' ./src/manifest.json | cut -d":" -f2 | tr -d \" | tr -d , | cut -d" " -f2)
version=$manversion-$gitversion

sed -i.bak 's/REPLACE_ME_WITH_THE_VERSION_USING_SED/'$version'/' ./build/background.js
sed -i.bak 's/REPLACE_ME_WITH_THE_VERSION_USING_SED/'$version'/' ./build/static/newtab.html
rm ./build/background.js.bak
rm ./build/static/newtab.html.bak

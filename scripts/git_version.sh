#!/usr/bin/env bash

gitversion=$(git describe --tags | cut -d"-" -f2-)
manversion=$(grep '"version":' ./src/manifest.json | cut -d":" -f2 | tr -d \" | tr -d , | cut -d" " -f2)
version=$manversion-$gitversion

sed -i 's/REPLACE_ME_WITH_THE_VERSION_USING_SED/'$version'/' ./build/background.js

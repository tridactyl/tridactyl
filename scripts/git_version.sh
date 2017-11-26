#!/usr/bin/env bash

version=$(git describe --tags)

sed -i 's/REPLACE_ME_WITH_THE_VERSION_USING_SED/'$version'/' ./build/background.js

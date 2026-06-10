#! /bin/sh
yarn run build --no-native
cd "${0%/*}"/../build || exit 1
"$(yarn bin)/web-ext" lint

#! /bin/sh
cd "${0%/*}" || exit
yarn run build --no-native
"$(yarn bin)/jest" src

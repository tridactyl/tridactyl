#! /bin/sh
cd ${0%/*}
yarn run build --no-native
"$(yarn bin)/jest" src

#! /bin/sh
yarn run build --no-native
cd ${0%/*}/../build
"$(yarn bin)/web-ext" lint

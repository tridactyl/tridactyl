#! /bin/sh
set -e

yarn run build --no-native
"$(yarn bin)/web-ext" lint --source-dir build
"$(yarn bin)/web-ext" lint --source-dir build-android
yarn make-zip:android

#!/usr/bin/env bash
temp=$(mktemp -d)
unzip -qq "$1" -d "$temp"
jq '.applications.gecko.id' "$temp"/manifest.json | tr -d '"'

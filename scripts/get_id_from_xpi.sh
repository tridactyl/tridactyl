#!/usr/bin/env bash
temp=$(mktemp -d)
unzip -qq "$1" -d "$temp"
jq '.browser_specific_settings.gecko.id' "$temp"/manifest.json | tr -d '"'

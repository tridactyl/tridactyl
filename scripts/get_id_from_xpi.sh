#!/usr/bin/env bash
unzip -p "$1" manifest.json | node -e 'const manifest = JSON.parse(require("fs").readFileSync(0)); console.log(manifest.browser_specific_settings.gecko.id)'

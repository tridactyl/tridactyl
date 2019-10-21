#!/usr/bin/env bash
installdir=${1:-/usr/lib/firefox/browser/extensions}
xpi=web-ext-artifacts/$(ls -t web-ext-artifacts/ | head -n1)
install -Dm644 "$xpi" "$installdir"/"$(scripts/get_id_from_xpi.sh "$xpi")".xpi

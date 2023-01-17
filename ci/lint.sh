#!/bin/sh
cd "${0%/*}"/.. || exit 1
if [ -x "$(command -v shellcheck)" ]; then
	GLOBIGNORE="node_modules" shellcheck -e2012 ./**/*.sh
else
	echo "Warning: shellcheck is not installed, skipping shell scripts"
fi
yarn add --dev https://github.com/tridactyl/eslint-plugin-compat#webext
yarn run lint
"$(yarn bin)/eslint" --ext .ts .

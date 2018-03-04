#!/bin/sh

set -e

PATH=$(npm bin):"$PATH"
export PATH
CLEANSLATE="node_modules/cleanslate/docs/files/cleanslate.css"

mkdir -p generated/static
scripts/excmds_macros.py
scripts/newtab.md.sh
scripts/make_docs.sh &

(webpack --display errors-only && scripts/git_version.sh)&

wait

if [ -e "$CLEANSLATE" ] ; then
	cp "$CLEANSLATE" build/static/cleanslate.css
else
	echo "Couldn't find cleanslate.css. Try running 'npm install'"
fi

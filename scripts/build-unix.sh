#!/bin/sh

set -e

CLEANSLATE="node_modules/cleanslate/docs/files/cleanslate.css"

PATH="$(npm bin):$PATH"
export PATH

mkdir -p build
mkdir -p build/static
mkdir -p generated/static
mkdir -p generated/static/clippy

scripts/excmds_macros.py
scripts/newtab.md.sh
scripts/make_tutorial.sh
scripts/make_docs.sh &

$(npm bin)/nearleyc src/grammars/bracketexpr.ne \
  > src/grammars/.bracketexpr.generated.ts

native/install.sh local

(webpack --display errors-only \
  && scripts/git_version.sh) &

wait

scripts/bodgecss.sh
scripts/authors.sh

if [ -e "$CLEANSLATE" ] ; then
	cp -v "$CLEANSLATE" build/static/css/cleanslate.css
else
	echo "Couldn't find cleanslate.css. Try running 'npm install'"
fi

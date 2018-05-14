#!/bin/sh

set -e

CLEANSLATE="node_modules/cleanslate/docs/files/cleanslate.css"

isWindowsMingw() {
  local is_mingw="False"
  if [ "$(uname | cut -c 1-5)" == "MINGW" ]; then
    is_mingw="True"
  fi

  echo -n "${is_mingw}"
}

if [ "$(isWindowsMingw)" == "True" ]; then
  NPM_BIN_DIR="$(cygpath $(npm bin))"
  PATH=$NPM_BIN_DIR:$PATH
else
  PATH="$(npm bin):$PATH"
fi

export PATH

mkdir -p build
mkdir -p build/static
mkdir -p generated/static
mkdir -p generated/static/clippy

scripts/excmds_macros.py
scripts/newtab.md.sh
scripts/make_tutorial.sh
scripts/make_docs.sh &

nearleyc src/grammars/bracketexpr.ne \
  > src/grammars/.bracketexpr.generated.ts

if [ "$(isWindowsMingw)" == "True" ]; then
  powershell native/win_install.ps1
else
  native/install.sh local
fi

(webpack --display errors-only \
  && scripts/git_version.sh) &

wait

if [ -e "$CLEANSLATE" ] ; then
	cp -v "$CLEANSLATE" build/static/cleanslate.css
else
	echo "Couldn't find cleanslate.css. Try running 'npm install'"
fi

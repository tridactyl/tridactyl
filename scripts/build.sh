#!/bin/sh

set -e

CLEANSLATE="node_modules/cleanslate/docs/files/cleanslate.css"

NATIVE_BIN_DIR="native"
WIN_COMPILE_NATIVE_BIN_TARGET="${NATIVE_BIN_DIR}/native_main.py"
WIN_COMPILE_NATIVE_BIN_OUTPUT="${NATIVE_BIN_DIR}/native_main.exe"

if [ $PYINSTALLER = "0" ]; then
  WIN_COMPILE_NATIVE_BIN="False"
else
  WIN_COMPILE_NATIVE_BIN="True"
fi

isWindowsMinGW() {
  local expected_prefix="MINGW"
  local is_mingw="False"

  if [ "$(uname | cut -c 1-5)" = "$expected_prefix" ]; then
    is_mingw="True"
  fi

  echo -n "$is_mingw"
}

checkPyinstallerStatus() {
  local expected_prefix="3.3"
  local pyinstaller_found="False"

  if [ "$(pyinstaller --version \
    | cut -c 1-3)" = "$expected_prefix" ]; then
    pyinstaller_found="True"
  fi

  echo -n "$pyinstaller_found"
}

compileNativeBin() {
  local success="False"

  local output_dir="$NATIVE_BIN_DIR"
  local target_file="${WIN_COMPILE_NATIVE_BIN_TARGET}"

  if [ "$(checkPyinstallerStatus)" = "False" ]; then
    $WIN_PYTHON -m pip install --upgrade pyinstaller
  fi

  if [ ! -d "$output_dir" ]; then
    mkdir -v -p "$output_dir"
  fi

  pyinstaller \
    --clean \
    --console \
    --onefile \
    --noupx \
    --noconfirm \
    --workpath "$output_dir" \
    --distpath "$output_dir" \
    "$target_file"

  if [ $? -eq 0 ] \
    && [ -f "$WIN_COMPILE_NATIVE_BIN_OUTPUT" ]; then
    success="True"
  fi

  echo -n "$success"
}

installWindowsNativeMessenger() {
  if [ "$WIN_COMPILE_NATIVE_BIN" = "True" ]; then
    success="$(compileNativeBin)"

    if [ "$success" = "True" ]; then
      printf "\n[+] %s -> %s compilation was successful!\n\n" \
        $WIN_COMPILE_NATIVE_BIN_TARGET \
        $WIN_COMPILE_NATIVE_BIN_OUTPUT

      powershell \
        -NoProfile \
        -InputFormat None \
        -ExecutionPolicy Bypass \
        native/win_install.ps1 -DebugDirBase native
    else
      printf "[+] %s -> %s compilation failed, quitting ..." \
        $WIN_COMPILE_NATIVE_BIN_TARGET \
        $WIN_COMPILE_NATIVE_BIN_OUTPUT

      exit -1
    fi

  else
    powershell \
      -NoProfile \
      -InputFormat None \
      -ExecutionPolicy Bypass \
      native/win_install.ps1 -DebugDirBase native -UsePython
  fi
}

if [ "$(isWindowsMinGW)" = "True" ]; then
  WIN_PYTHON="py -3"
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

if [ "$(isWindowsMinGW)" = "True" ]; then
  $WIN_PYTHON scripts/excmds_macros.py
else
  scripts/excmds_macros.py
fi
scripts/newtab.md.sh
scripts/make_tutorial.sh
scripts/make_docs.sh &

nearleyc src/grammars/bracketexpr.ne \
  > src/grammars/.bracketexpr.generated.ts

if [ "$(isWindowsMinGW)" = "True" ]; then
  installWindowsNativeMessenger
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

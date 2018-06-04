#!/bin/sh

set -e

isWindowsMinGW() {
  local is_mingw="False"

  if [ "$(uname | cut -c 1-5)" = "MINGW" ] \
    || [ "$(uname | cut -c 1-4)" = "MSYS" ]; then
    is_mingw="True"
  fi

  echo -n "${is_mingw}"
}

mainFunction() {
  if [ "$(isWindowsMinGW)" = "True" ]; then
    echo "[+] Executing Windows build script ..."
    scripts/build-windows.sh
  else
    echo "[+] Executing Unix build script ..."
    scripts/build-unix.sh
  fi
}

mainFunction "$@"


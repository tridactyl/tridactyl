#!/usr/bin/env bash
set -e

# This script must be run from the root Tridactyl directory
TRIDIR="$(pwd)"

BUILDROOT="${TRIDIR}/.wine-pyinstaller"
OUTDIR="${BUILDROOT}/dist"
DLDIR="${BUILDROOT}/downloads"

PYVER="3.5.4"
PYDIR="${BUILDROOT}/python-${PYVER}"
WINPY_HASH="b5d90c5252a624117ccec8678862d6144710219737f06cd01deb1df963f639fd"
WINPY_EXE="${DLDIR}/winpython-${PYVER}.exe"

WINEDIR="${BUILDROOT}/wine"
WINEARCH="win32"
export WINEDEBUG="fixme-all"

# stop wine whining
export DISPLAY=

PREREQUISITES="tput printf 7z wine"

MIN_WINE_VER="3"
MIN_7ZIP_VER="16"

checkRequiredVersions() {
   if [ -z "$(7z \
              | awk '/Version/{print $3}' \
              | grep "${MIN_7ZIP_VER}")" ]; then
      colorEcho \
        "[-] p7zip minimum version ${MIN_7ZIP_VER} required\n" \
        "alert"
      exit -1
   fi

   if [ -z "$(wine --version 2> /dev/null \
              | grep "wine-${MIN_WINE_VER}")" ]; then
      colorEcho \
        "[-] wine minimum version ${MIN_WINE_VER} required\n" \
        "alert"
      exit -1
   fi
}

stripWhitespace() {
  local input="$@"
  printf "${input}\n" | tr -d "[:space:]"
}

colorEcho() {
  local COLOR_RESET=$(tput sgr0 2>/dev/null)
  local COLOR_BOLD=$(tput bold 2>/dev/null)
  local COLOR_BAD=$(tput setaf 1 2>/dev/null)
  local COLOR_GOOD=$(tput setaf 2 2>/dev/null)

  local str="$1"
  local color="${COLOR_GOOD}${COLOR_BOLD}"

  if [ ! -z "$2" ] \
    && [ "$(stripWhitespace "$2")" = "alert" ]; then
    color="${COLOR_BAD}${COLOR_BOLD}"
  fi

  printf "${color}${str}${COLOR_RESET}"
}

checkPrerequisite() {
  local bin_name="$1"
  local bin_loc=$(which "${bin_name}" 2>/dev/null)

  if [ -z "${bin_loc}" ] \
    || [ ! -f "${bin_loc}" ]; then
    printf "    - '$1' not found, quitting ...\n"
    exit -1
  else
    printf "    - '${bin_name}' found at ${bin_loc}\n"
  fi
}


mainFunction() {
  export "WINEARCH=${WINEARCH}"
  export "WINEPREFIX=${WINEDIR}"


  ## Check prerequisites
  colorEcho "[+] Checking prerequisites ...\n"
  for bin in ${PREREQUISITES}; do
    checkPrerequisite "${bin}"
  done

  checkRequiredVersions


  ## Create required directories
  mkdir -pv "${BUILDROOT}"
  mkdir -pv "${DLDIR}"
  mkdir -pv "${OUTDIR}"
  mkdir -pv "$TRIDIR"/web-ext-artifacts/


  ## Download Python and Pip
  colorEcho "[+] Downloading necessary files ...\n"

  if [ ! -f "${WINPY_EXE}" ]; then
    wget \
      "https://github.com/winpython/winpython/releases/download/1.10.20180404/WinPython32-${PYVER}.2Zero.exe" \
      -O "${WINPY_EXE}"
  fi

  if [ ! "$(sha256sum "${WINPY_EXE}" \
    | cut -d" " -f1)" = ${WINPY_HASH} ]; then
    colorEcho "[-] ${WINPY_EXE} has incorrect hash, quitting ...\n"
    exit 1
  fi

  ## Extract Python-3.5.4 from WinPython if required

  rm -rf "${WINEDIR}"
  local winepython="wine $PYDIR/python.exe"

  if [ ! -f "$PYDIR/python.exe" ]; then
    colorEcho "[+] Extract Python-${PYVER}\n"
    7z x "${DLDIR}/winpython-${PYVER}.exe" "python-$PYVER" -o"$BUILDROOT"

    $winepython -m pip install --upgrade pip

    colorEcho "[+] Installing PyInstaller ...\n"
    $winepython -m pip install pyinstaller
  fi

  ## Compile with PyInstaller
  colorEcho "[+] Compiling with PyInstaller under Wine ...\n"
  rm -rf "${OUTDIR}"
  PYTHONHASHSEED=1 wine "$PYDIR"/Scripts/pyinstaller.exe \
    --clean \
    --console \
    --onefile \
    --noupx \
    --noconfir \
    --log-level=ERROR \
    --workpath "${OUTDIR}" \
    --distpath "${OUTDIR}" \
    "$TRIDIR/native/native_main.py"

  ## Test the compiled EXE
  colorEcho "[+] Checking compiled binary ...\n"
  OUTFILE="${OUTDIR}/native_main.exe"
  cp "$OUTFILE" "$TRIDIR"/web-ext-artifacts/

  if [ -f "${OUTFILE}" ]; then
    python3 \
      "$TRIDIR/native/gen_native_message.py" cmd..version \
      | wine "$TRIDIR"/web-ext-artifacts/native_main.exe

    printf "\n"
    colorEcho "[+] PyInstaller with Wine was successful!\n"
  else
    colorEcho \
      "[-] PyInstaller compilation failed, quitting ...\n" \
      "alert"
    exit -1
  fi
}

mainFunction "$@"

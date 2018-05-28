#!/bin/bash -e

# This script must be run from the root Tridactyl directory

cd scripts/

# stop wine whining
DISPLAY=""

BASEDIR="$(pwd)"

TESTDIR="${BASEDIR}/../.wine-pyinstaller"
OUTDIR="${TESTDIR}/dist"
DLDIR="${TESTDIR}/downloads"

PYVER="3.5.4"
PYDIR="${TESTDIR}/python-${PYVER}"
WINPY_HASH="b5d90c5252a624117ccec8678862d6144710219737f06cd01deb1df963f639fd"
WINPY_EXE="${DLDIR}/winpython-${PYVER}.exe"

WINEDIR="${TESTDIR}/wine"
WINEARCH="win32"

NATIVE_MAIN_URL="https://raw.githubusercontent.com/gsbabil/tridactyl/gsbabil/fix-restart-command-on-windows/native/native_main.py"

PREREQUISITES="tput printf 7z wine"

COLOR_RESET=$(tput sgr0 2>/dev/null)
COLOR_BOLD=$(tput bold 2>/dev/null)
COLOR_BAD=$(tput setaf 1 2>/dev/null)
COLOR_GOOD=$(tput setaf 2 2>/dev/null)

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
  mkdir -pv "${TESTDIR}"
  mkdir -pv "${OUTDIR}"
  mkdir -pv "${DLDIR}"
  mkdir -pv "${OUTDIR}"


  colorEcho "[+] Downloading necessary files ...\n"
  ## Download Python and Pip
  cd "${DLDIR}"

  if [ ! -f "${WINPY_EXE}" ]; then
    wget \
      "https://github.com/winpython/winpython/releases/download/1.10.20180404/WinPython32-${PYVER}.2Zero.exe" \
      -O "${WINPY_EXE}"
  fi

  if [ ! "$(sha256sum "${WINPY_EXE}" \
    | cut -d" " -f1)" = ${WINPYHASH} ]; then
    colorEcho "[-] ${WINPY_EXE} has incorrect hash, quitting ...\n"
  fi

  wget "${NATIVE_MAIN_URL}" -O "${DLDIR}/native_main.py"

  wget "https://bootstrap.pypa.io/get-pip.py" -O "${DLDIR}/get-pip.py"

  ## Extract Python-3.5.4 from WinPython
  colorEcho "[+] Extract Python-${PYVER}\n"
  cd "${TESTDIR}"
  7z x "${DLDIR}/winpython-${PYVER}.exe" "python-${PYVER}" -aoa


  ## Install Pip and PyInstaller
  rm -rf "${WINEDIR}"
  cd "${PYDIR}"

  colorEcho "[+] Installing Pip ...\n"
  wine python.exe "${DLDIR}/get-pip.py"

  colorEcho "[+] Installing PyInstaller ...\n"
  wine python.exe -m pip install --upgrade pyinstaller

  ## Compile with PyInstaller
  colorEcho "[+] Compiling with PyInstaller under Wine ...\n"
  rm -rf "${OUTDIR}"
  PYTHONHASHSEED=1 wine Scripts/pyinstaller \
    --clean \
    --console \
    --onefile \
    --noupx \
    --noconfir \
    --log-level=ERROR \
    --workpath "${OUTDIR}" \
    --distpath "${OUTDIR}" \
    "${DLDIR}/native_main.py"

  ## Test the compiled EXE
  colorEcho "[+] Checking compiled binary ...\n"
  OUTFILE="${OUTDIR}/native_main.exe"

  if [ -f "${OUTFILE}" ]; then
    python3 \
      "../../../native/gen_native_message.py" cmd..version \
      | wine "${OUTFILE}"

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


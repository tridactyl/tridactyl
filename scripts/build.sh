#!/bin/sh

set -e

CLEANSLATE="node_modules/cleanslate/docs/files/cleanslate.css"

COLOR_RESET=$(tput sgr0 2>/dev/null)
COLOR_BOLD=$(tput bold 2>/dev/null)
COLOR_BAD=$(tput setaf 1 2>/dev/null)
COLOR_GOOD=$(tput setaf 2 2>/dev/null)

WIN_PYTHON_CMD="py -3"
WIN_PREREQUISITES="tput printf cygpath which npm pyinstaller"

NATIVE_BIN_DIR="native"
WIN_COMPILE_NATIVE_BIN_SOURCE="${NATIVE_BIN_DIR}/native_main.py"
WIN_COMPILE_NATIVE_BIN_OUTPUT="${NATIVE_BIN_DIR}/native_main.exe"
WIN_COMPILE_NATIVE_BIN_SIG_FILE="${NATIVE_BIN_DIR}/native_main.exe.sig"
WIN_COMPILE_NATIVE_BIN_HASH_FILE="${NATIVE_BIN_DIR}/native_main.exe.sha256"
WIN_NATIVE_BIN_INSTALLER="${NATIVE_BIN_DIR}/win_install.ps1"

## should be adjusted by 'cmcaine/tridactyl' repo maintainers
WIN_COMPILE_NATIVE_BIN_GPG2_SIGNER="gsbabil@gmail.com"

if [ ! -z "${PYINSTALLER}" ] \
  && [ "${PYINSTALLER}" = "1" ]; then
  WIN_COMPILE_NATIVE_BIN="True"
else
  WIN_COMPILE_NATIVE_BIN="False"
fi

stripWhitespace() {
  local input="$@"
  echo "${input}" | tr -d "[:space:]"
}

colorEcho() {
  local str="$1"
  local color="${COLOR_GOOD}${COLOR_BOLD}"

  if [ ! -z "$2" ] \
    && [ "$(stripWhitespace "$2")" = "alert" ]; then
    color="${COLOR_BAD}${COLOR_BOLD}"
  fi

  echo -e "${color}${str}${COLOR_RESET}"
}

checkWindowsPrerequisite() {
  local bin_name="$1"
  local bin_loc=$("${WIN_WHICH_BIN_PATH}" \
    "${bin_name}" 2>/dev/null)

  if [ -z "${bin_loc}" ] \
    || [ ! -f "${bin_loc}" ]; then
    echo "    - '$1' not found, quitting ..."
    exit -1
  else
    echo "    - '${bin_name}' found at ${bin_loc}"
  fi
}

isWindowsMinGW() {
  local expected_prefix="MINGW"
  local is_mingw="False"

  if [ "$(uname | cut -c 1-5)" = "${expected_prefix}" ]; then
    is_mingw="True"
  fi

  echo -n "${is_mingw}"
}

checkPyinstallerStatus() {
  local expected_prefix="3.3"
  local pyinstaller_found="False"

  if [ "$(pyinstaller --version \
    | cut -c 1-3)" = "${expected_prefix}" ]; then
    pyinstaller_found="True"
  fi

  echo -n "${pyinstaller_found}"
}

windowsAutoDetectBinPath() {
  local win_bin_name="$1"

  if [ ! -x "${win_bin_name}" ]; then
    win_bin_path=$(powershell \
          -NoProfile \
          -InputFormat None \
          -ExecutionPolicy Bypass \
      "Get-Command ${win_bin_name} \
        | Select-Object -ExpandProperty Source")
  fi

  if [ -x "${win_bin_path}" ]; then
    echo -n "${win_bin_path}"
  else
    echo -n "NULL"
  fi
}

windowsToUnixPath() {
  local win_bin_path="$1"

  local unix_path="$("${WIN_CYGPATH_BIN_PATH}" \
        --absolute \
        --unix \
        "${win_bin_path}")"

  if [ $? -eq 0 ] && [ ! -z "${unix_path}" ]; then
    echo -n "${unix_path}"
  else
    echo -n "NULL"
  fi
}

findWindowsBinPath() {
  local bin_name="$1"
  local bin_path="$("${WIN_WHICH_BIN_PATH}" "${bin_name}")"

  if [ $? -eq 0 ] && [ ! -z "${bin_path}" ]; then
    echo -n "${bin_path}"
  else
    echo -n "NULL"
  fi
}

signWindowsCompiledNativeBin() {
  local success="False"

  local winpty_bin_path="$(findWindowsBinPath "winpty.exe")"
  local gpg2_bin_path="$(findWindowsBinPath "gpg2.exe")"
  local sha256sum_bin_path="$(findWindowsBinPath "sha256sum.exe")"

  if [ "${winpty_bin_path}" = "NULL" ]; then
    colorEcho \
      "[-] winpty.exe binary not found, quitting ..." \
      "alert"
    exit -1
  fi

  if [ "${gpg2_bin_path}" = "NULL" ]; then
    colorEcho \
      "[-] gpg2.exe binary not found, quitting ..." \
      "alert"
    exit -1
  fi

  if [ "${sha256sum_bin_path}" = "NULL" ]; then
    colorEcho \
      "[-] sha256sum.exe binary not found, quitting ..." \
      "alert"
    exit -1
  fi

  colorEcho "[+] winpty.exe found at: ${winpty_bin_path}"
  colorEcho "[+] gpg2.exe found at: ${gpg2_bin_path}"
  colorEcho "[+] sha256sum.exe found at: ${sha256sum_bin_path}"

  "${gpg2_bin_path}" \
    --yes \
    --armor \
    --detach-sig \
    --output "${WIN_COMPILE_NATIVE_BIN_SIG_FILE}" \
    --local-user "${WIN_COMPILE_NATIVE_BIN_GPG2_SIGNER}" \
    "${WIN_COMPILE_NATIVE_BIN_OUTPUT}"

  if [ -f "${WIN_COMPILE_NATIVE_BIN_SIG_FILE}" ]; then
    colorEcho \
      "$(printf \
          "[+] %s successfully generated\n" \
          "${WIN_COMPILE_NATIVE_BIN_SIG_FILE}")"
  else
    colorEcho \
      "$(printf \
          "[-] Failed to sign %s\n, quitting ..." \
          "${WIN_COMPILE_NATIVE_BIN_OUTPUT}")"
    exit -1
  fi

  "${sha256sum_bin_path}" \
    "${WIN_COMPILE_NATIVE_BIN_OUTPUT}" \
    > "${WIN_COMPILE_NATIVE_BIN_HASH_FILE}"

  if [ -f "${WIN_COMPILE_NATIVE_BIN_SIG_FILE}" ]; then
    colorEcho \
      "$(printf \
          "[+] %s successfully generated\n" \
          "${WIN_COMPILE_NATIVE_BIN_HASH_FILE}")"

    colorEcho "[+] Cross-checking signature ... "
    "${gpg2_bin_path}" \
      --verify "${WIN_COMPILE_NATIVE_BIN_SIG_FILE}" \
      "${WIN_COMPILE_NATIVE_BIN_OUTPUT}"

    if [ $? -ne 0 ]; then
      colorEcho \
        "    - Signature verification failed, quitting ..." \
        "alert"
      exit -1
    else
      colorEcho \
        "    - Signature verification was successful!"
    fi

    colorEcho "[+] Cross-checking hash ... "
    "${sha256sum_bin_path}" \
      --check "${WIN_COMPILE_NATIVE_BIN_HASH_FILE}"

    if [ $? -ne 0 ]; then
      colorEcho \
        "    - Hash verification failed, quitting ..." \
        "alert"
      exit -1
    else
      colorEcho \
        "    - Hash verification was successful!"
    fi

  else
    colorEcho \
      "$(printf \
          "[-] failed to sign %s\n, quitting ..." \
          "${WIN_COMPILE_NATIVE_BIN_HASH_FILE}")"
    exit -1
  fi

  success="True"
  echo -n "${success}"
}

compileWindowsNativeBin() {
  local success="False"

  local output_dir="${NATIVE_BIN_DIR}"
  local target_file="${WIN_COMPILE_NATIVE_BIN_SOURCE}"

  if [ "$(checkPyinstallerStatus)" = "False" ]; then
    "${WIN_PYTHON_CMD}" -m \
      pip install --upgrade pyinstaller
  fi

  if [ ! -d "${output_dir}" ]; then
    mkdir -v -p "${output_dir}"
  fi

  PYTHONHASHSEED=1 pyinstaller \
    --clean \
    --console \
    --onefile \
    --noupx \
    --noconfirm \
    --log-leve=ERROR \
    --workpath "${output_dir}" \
    --distpath "${output_dir}" \
    "${target_file}"

  if [ $? -eq 0 ] \
    && [ -f "${WIN_COMPILE_NATIVE_BIN_OUTPUT}" ]; then
    success="True"
  fi

  echo -n "${success}"
}

installWindowsNativeMessenger() {
  if [ "${WIN_COMPILE_NATIVE_BIN}" = "True" ]; then
    colorEcho "[+] Starting Python -> EXE compilation ..."

    local success="$(stripWhitespace \
      "$(compileWindowsNativeBin | tail -n1)")"

    if [ "${success}" = "True" ]; then
      colorEcho \
        "$(printf \
            "\n[+] %s -> %s compilation was successful!\n" \
            "${WIN_COMPILE_NATIVE_BIN_SOURCE}" \
            "${WIN_COMPILE_NATIVE_BIN_OUTPUT}")"

      ##
      ## Disable GPG signing for now, until decided otherwise later
      ##
      # colorEcho \
      #   "$(printf "[+] Signing compiled binary: %s ...\n" \
      #       "${WIN_COMPILE_NATIVE_BIN_OUTPUT}")"
      #
      # success="$(stripWhitespace \
      #   "$(signWindowsCompiledNativeBin | tail -n1)")"
      #
      # if [ "${success}" = "True" ]; then
      #   colorEcho \
      #     "$(printf "    - %s successfully generated\n" \
      #         "${WIN_COMPILE_NATIVE_BIN_SIG_FILE}")"
      #
      #   colorEcho \
      #     "$(printf "    - %s successfully generated\n" \
      #         "${WIN_COMPILE_NATIVE_BIN_HASH_FILE}")"

        echo
        colorEcho "[+] Installing native messenger ..."
        powershell \
          -NoProfile \
          -InputFormat None \
          -ExecutionPolicy Bypass \
          "${WIN_NATIVE_BIN_INSTALLER}" \
            -DebugDirBase native

      ##
      ## Disable GPG signing for now, until decided otherwise later
      ##
      # else
      #   colorEcho \
      #     "$(printf \
      #         "[-] Signing %s failed, quitting ..." \
      #         $WIN_COMPILE_NATIVE_BIN_OUTPUT)" \
      #     "alert"
      #   exit -1
      #
      # fi

    else
      colorEcho \
        "$(printf \
            "[-] %s -> %s compilation failed, quitting ..." \
            $WIN_COMPILE_NATIVE_BIN_SOURCE \
            $WIN_COMPILE_NATIVE_BIN_OUTPUT)" \
        "alert"
      exit -1
    fi

  else
    colorEcho "[+] Skipping Python -> EXE compilation ..."
    echo

    powershell \
      -NoProfile \
      -InputFormat None \
      -ExecutionPolicy Bypass \
      "${WIN_NATIVE_BIN_INSTALLER}" \
        -DebugDirBase native \
        -UsePython
  fi
}

mainFunction() {
  if [ "$(isWindowsMinGW)" = "True" ]; then
    colorEcho "[+] Windows MinGW system detected ..."

    WIN_WHICH_BIN_PATH="$(windowsAutoDetectBinPath \
      "which.exe")"

    WIN_CYGPATH_BIN_PATH="$(windowsAutoDetectBinPath \
      "cygpath.exe")"

    WIN_WHICH_BIN_PATH="$(windowsToUnixPath \
      "${WIN_WHICH_BIN_PATH}")"

    if [ -x "${WIN_WHICH_BIN_PATH}" ]; then
      colorEcho \
        "$(printf \
            "[+] which.exe binary found at: %s\n" \
            "${WIN_WHICH_BIN_PATH}")"
    else
      colorEcho \
        "[-] which.exe binary not found, quitting ..." \
        "alert"
      exit -1
    fi

    WIN_CYGPATH_BIN_PATH="$(windowsToUnixPath \
      "${WIN_CYGPATH_BIN_PATH}")"

    if [ -x "${WIN_CYGPATH_BIN_PATH}" ]; then
      colorEcho \
        "$(printf \
          "[+] cygpath.exe binary found at: %s\n" \
          "${WIN_CYGPATH_BIN_PATH}")"
    else
      colorEcho \
        "[-] cygpath.exe binary not found, quitting ..." \
        "alert"
      exit -1
    fi

    local win_npm_bin_path="$(findWindowsBinPath npm)"

    if [ "${win_npm_bin_path}" = "NULL" ]; then
      colorEcho \
        "[-] 'npm' binary not found, quitting ..." \
        "alert"
      exit -1
    fi

    local win_npm_bin_dir="$(windowsToUnixPath \
      "$("${win_npm_bin_path}" bin)")"

    PATH="${win_npm_bin_dir}:${PATH}"

  else
    PATH="$(npm bin):${PATH}"
  fi

  export PATH

  if [ "$(isWindowsMinGW)" = "True" ]; then
    colorEcho \
      "[+] Cross-checking Windows prerequisites ..." \

    for bin in ${WIN_PREREQUISITES}; do
      checkWindowsPrerequisite "${bin}"
    done
  fi

  mkdir -v -p build
  mkdir -v -p build/static
  mkdir -v -p generated/static
  mkdir -v -p generated/static/clippy

  if [ "$(isWindowsMinGW)" = "True" ]; then
    ${WIN_PYTHON_CMD} scripts/excmds_macros.py
  else
    scripts/excmds_macros.py
  fi
  scripts/newtab.md.sh
  scripts/make_tutorial.sh

  if [ "$(isWindowsMinGW)" = "True" ]; then
    ## disable backgrounding task on Windows
    scripts/make_docs.sh
  else
    scripts/make_docs.sh &
  fi

  nearleyc src/grammars/bracketexpr.ne \
    > src/grammars/.bracketexpr.generated.ts

  if [ "$(isWindowsMinGW)" = "True" ]; then
    installWindowsNativeMessenger
  else
    native/install.sh local
  fi

  if [ "$(isWindowsMinGW)" = "True" ]; then
    ## disable backgrounding task on Windows
    webpack --display errors-only
    scripts/git_version.sh
  else
    (webpack --display errors-only \
      && scripts/git_version.sh) &

    wait
  fi

  if [ -e "${CLEANSLATE}" ] ; then
    cp -v "${CLEANSLATE}" build/static/cleanslate.css
  else
    colorEcho \
      "Couldn't find cleanslate.css. Try running 'npm install'" \
      "alert"
  fi
}

mainFunction "$@"


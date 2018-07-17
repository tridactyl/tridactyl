#!/bin/sh
#
# Library of Tridactyl build functions to be used on Windows. These
# functions must be source _after_ importing the common build
# library ('scripts/build-library-common.sh').
#

set -e

##################################################################
# Read-only global variable(s)
##################################################################
readonly BUILD_WINDOWS_DEBUG="True"
readonly COLOR_RESET=$(tput sgr0 2>/dev/null)
readonly COLOR_BOLD=$(tput bold 2>/dev/null)
readonly COLOR_BAD=$(tput setaf 1 2>/dev/null)
readonly COLOR_GOOD=$(tput setaf 2 2>/dev/null)

readonly WIN_COMPILE_NATIVE_BIN_SOURCE="${NATIVE_DIR_NAME}/native_main.py"
readonly WIN_COMPILE_NATIVE_BIN_OUTPUT="${NATIVE_DIR_NAME}/native_main.exe"
readonly WIN_COMPILE_NATIVE_BIN_SIG_FILE="${NATIVE_DIR_NAME}/native_main.exe.sig"
readonly WIN_COMPILE_NATIVE_BIN_HASH_FILE="${NATIVE_DIR_NAME}/native_main.exe.sha256"
readonly WIN_NATIVE_BIN_INSTALLER="${NATIVE_DIR_NAME}/win_install.ps1"
readonly WIN_COMPILE_NATIVE_BIN_GPG2_SIGNER="gsbabil@gmail.com"

##################################################################
# Mutable global variable(s)
##################################################################
WIN_PREREQUISITES="tput printf cygpath which npm"


##################################################################
# Check for a single prerequisite needed to build Tridactyl on
# Windows.
#
# Globals:
#   WIN_WHICH_BIN_PATH
# Arguments:
#   $1 is the name of the prerequisite
# Returns:
#   None. Exits build if prerequisite not found.
##################################################################
windows_check_prerequisite() {
  local bin_name="$1"
  local bin_loc=$("${WIN_WHICH_BIN_PATH}" \
    "${bin_name}" 2>/dev/null)

  if [ -z "${bin_loc}" ] \
    || [ ! -f "${bin_loc}" ]; then
    printf "    - '$1' not found, quitting ...\n"
    exit -1
  else
    printf "    - '${bin_name}' found at ${bin_loc}\n"
  fi
}


##################################################################
# Detect a group of prerequisites to build Tridactyl on Windows.
#
# Globals:
#   WIN_PREREQUISITES
#   WIN_COMPILE_NATIVE_BIN
##################################################################
windows_detect_prerequisites() {
  if [ ! -z "${PYINSTALLER}" ] \
    && [ "${PYINSTALLER}" = "1" ]; then
    WIN_COMPILE_NATIVE_BIN="True"
    WIN_PREREQUISITES="${WIN_PREREQUISITES} pyinstaller"
  else
    WIN_COMPILE_NATIVE_BIN="False"
  fi

  for bin in ${WIN_PREREQUISITES}; do
    windows_check_prerequisite "${bin}"
  done
}


##################################################################
# Check the status of PyInstaller on Windows.
#
# Returns:
#   "True" if PyInstaller is found.
#   "False" if PyInstaller is not found.
##################################################################
windows_check_pyinstaller() {
  local expected_prefix="3.3"
  local pyinstaller_found="False"

  if [ "$(pyinstaller --version \
    | cut -c 1-3)" = "${expected_prefix}" ]; then
    pyinstaller_found="True"
  fi

  printf "${pyinstaller_found}"
}


##################################################################
# Detect the full-path of the specified Windows binary using
# PowerShell.
#
# Arguments:
#   $1 is the name of the binary to detect.
# Returns:
#   Windows path of the specified binary if found.
#   Print "NULL" otherwise.
##################################################################
windows_find_path_with_powershell() {
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
    # We need 'echo' instead of 'printf' here to handle UTF-8
    # output of PowerShell.
    echo "${win_bin_path}"
  else
    printf "NULL"
  fi
}


##################################################################
# Detect the full-path of the specified binary on Windows using
# 'which' command from MinGW.
#
# Globals:
#   WIN_WHICH_BIN_PATH
# Arguments:
#   $1 is the name of the binary to detect.
# Returns:
#   Unix path of the specified binary if found.
#   Print "NULL" otherwise.
##################################################################
windows_find_path_with_mingw() {
  local bin_name="$1"
  local bin_path="$("${WIN_WHICH_BIN_PATH}" "${bin_name}")"

  if [ $? -eq 0 ] && [ ! -z "${bin_path}" ]; then
    printf "${bin_path}"
  else
    printf "NULL"
  fi
}


##################################################################
# Convert a given Windows path into Unix path. Specified path is
# _not_ checked if it exists or not. Only the conversion is
# performed using 'cygpath'.
#
# Globals:
#   WIN_CYGPATH_BIN_PATH
# Arguments:
#   $1 is the Windows path to be converted into Unix path.
# Returns:
#   Unix style path of the given Windows path.
#   Print "NULL" otherwise for zero-length input.
##################################################################
windows_convert_to_unix_path() {
  local win_bin_path="$1"
  local unix_path="$("${WIN_CYGPATH_BIN_PATH}" \
        --absolute \
        --unix \
        "${win_bin_path}")"

  if [ $? -eq 0 ] && [ ! -z "${unix_path}" ]; then
    printf "${unix_path}"
  else
    printf "NULL"
  fi
}


##################################################################
# Generate and validate GPG signature and SHA-256 hash for the
# specified Windows path.
#
# Globals:
#   WIN_COMPILE_NATIVE_BIN_OUTPUT
#   WIN_COMPILE_NATIVE_BIN_SIG_FILE
#   WIN_COMPILE_NATIVE_BIN_HASH_FILE
#   WIN_COMPILE_NATIVE_BIN_GPG2_SIGNER
# Arguments:
#   $1 is the Windows path to generate signature for.
# Returns:
#   "True" if signing and validation succeeds.
#   Exit with -1 error-code otherwise.
##################################################################
windows_sign_native_bin() {
  local success="False"
  local winpty_bin_path="$(\
    windows_find_path_with_mingw "winpty.exe")"
  local gpg2_bin_path="$(\
    windows_find_path_with_mingw "gpg2.exe")"
  local sha256sum_bin_path="$(\
    windows_find_path_with_mingw "sha256sum.exe")"

  if [ "${winpty_bin_path}" = "NULL" ]; then
    all_os_color_print \
      "[-] winpty.exe binary not found, quitting ...\n" \
      "alert"
    exit -1
  fi

  if [ "${gpg2_bin_path}" = "NULL" ]; then
    all_os_color_print \
      "[-] gpg2.exe binary not found, quitting ...\n" \
      "alert"
    exit -1
  fi

  if [ "${sha256sum_bin_path}" = "NULL" ]; then
    all_os_color_print \
      "[-] sha256sum.exe binary not found, quitting ...\n" \
      "alert"
    exit -1
  fi

  all_os_color_print \
    "[+] winpty.exe found at: ${winpty_bin_path}\n"

  all_os_color_print \
    "[+] gpg2.exe found at: ${gpg2_bin_path}\n"

  all_os_color_print \
    "[+] sha256sum.exe found at: ${sha256sum_bin_path}\n"

  "${gpg2_bin_path}" \
    --yes \
    --armor \
    --detach-sig \
    --output "${WIN_COMPILE_NATIVE_BIN_SIG_FILE}" \
    --local-user "${WIN_COMPILE_NATIVE_BIN_GPG2_SIGNER}" \
    "${WIN_COMPILE_NATIVE_BIN_OUTPUT}"

  if [ -f "${WIN_COMPILE_NATIVE_BIN_SIG_FILE}" ]; then
    all_os_color_print \
      "$(printf \
          "[+] %s successfully generated\n" \
          "${WIN_COMPILE_NATIVE_BIN_SIG_FILE}")"
  else
    all_os_color_print \
      "$(printf \
          "[-] Failed to sign %s\n, quitting ...\n" \
          "${WIN_COMPILE_NATIVE_BIN_OUTPUT}")"
    exit -1
  fi

  "${sha256sum_bin_path}" \
    "${WIN_COMPILE_NATIVE_BIN_OUTPUT}" \
    > "${WIN_COMPILE_NATIVE_BIN_HASH_FILE}"

  if [ -f "${WIN_COMPILE_NATIVE_BIN_SIG_FILE}" ]; then
    all_os_color_print \
      "$(printf \
          "[+] %s successfully generated\n" \
          "${WIN_COMPILE_NATIVE_BIN_HASH_FILE}")"

    all_os_color_print "[+] Cross-checking signature ... \n"
    "${gpg2_bin_path}" \
      --verify "${WIN_COMPILE_NATIVE_BIN_SIG_FILE}" \
      "${WIN_COMPILE_NATIVE_BIN_OUTPUT}"

    if [ $? -ne 0 ]; then
      all_os_color_print \
        "    - Signature verification failed, quitting ...\n" \
        "alert"
      exit -1
    else
      all_os_color_print \
        "    - Signature verification was successful!\n"
    fi

    all_os_color_print "[+] Cross-checking hash ...\n"
    "${sha256sum_bin_path}" \
      --check "${WIN_COMPILE_NATIVE_BIN_HASH_FILE}"

    if [ $? -ne 0 ]; then
      all_os_color_print \
        "    - Hash verification failed, quitting ...\n" \
        "alert"
      exit -1
    else
      all_os_color_print \
        "    - Hash verification was successful!\n"
    fi

  else
    all_os_color_print \
      "$(printf \
          "[-] failed to sign %s, quitting ...\n" \
          "${WIN_COMPILE_NATIVE_BIN_HASH_FILE}")"
    exit -1
  fi

  success="True"
  printf "${success}"
}


##################################################################
# Compile the native messenger Python script into EXE using
# PyInstaller.
#
# Globals:
#   WIN_PYTHON_CMD
#   NATIVE_DIR_NAME
#   WIN_COMPILE_NATIVE_BIN_SOURCE
#   WIN_COMPILE_NATIVE_BIN_OUTPUT
# Arguments:
#   $1 is the Windows path to generate signature for.
# Returns:
#   "True" if compilation is successful.
#   "False" if compilation fails.
##################################################################
windows_compile_native_bin() {
  local success="False"
  local output_dir="${NATIVE_DIR_NAME}"
  local target_file="${WIN_COMPILE_NATIVE_BIN_SOURCE}"

  if [ "$(windows_check_pyinstaller)" = "False" ]; then
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

  printf "${success}"
}


##################################################################
# Compile and install Tridactyl native messenger binary on Windows.
#
# Globals:
#   WIN_COMPILE_NATIVE_BIN
#   WIN_NATIVE_BIN_INSTALLER
#   WIN_COMPILE_NATIVE_BIN_SOURCE
#   WIN_COMPILE_NATIVE_BIN_OUTPUT
# Returns:
#   "True" if successful.
#   Exits with -1 if compilation fails.
##################################################################
windows_install_native_messenger() {
  if [ "${WIN_COMPILE_NATIVE_BIN}" = "True" ]; then
    all_os_color_print \
      "[+] Starting Python -> EXE compilation ...\n"

    local success="$(all_os_strip_whitespace \
      "$(windows_compile_native_bin | tail -n1)")"

    if [ "${success}" = "True" ]; then
      all_os_color_print \
        "$(printf \
            "\n[+] %s -> %s compilation was successful!\n" \
            "${WIN_COMPILE_NATIVE_BIN_SOURCE}" \
            "${WIN_COMPILE_NATIVE_BIN_OUTPUT}")"

      ##
      ## Disable GPG signing for now, until decided otherwise later
      ##
      # all_os_color_print \
      #   "$(printf "[+] Signing compiled binary: %s ...\n" \
      #       "${WIN_COMPILE_NATIVE_BIN_OUTPUT}")"
      #
      # success="$(all_os_strip_whitespace \
      #   "$(windows_sign_native_bin | tail -n1)")"
      #
      # if [ "${success}" = "True" ]; then
      #   all_os_color_print \
      #     "$(printf "    - %s successfully generated\n" \
      #         "${WIN_COMPILE_NATIVE_BIN_SIG_FILE}")"
      #
      #   all_os_color_print \
      #     "$(printf "    - %s successfully generated\n" \
      #         "${WIN_COMPILE_NATIVE_BIN_HASH_FILE}")"

        printf "\n"
        all_os_color_print \
          "[+] Installing native messenger ...\n"

        powershell \
          -NoProfile \
          -InputFormat None \
          -ExecutionPolicy Bypass \
          "${WIN_NATIVE_BIN_INSTALLER}" \
            -NoPython \
            -DebugDirBase native

      ##
      ## Disable GPG signing for now, until decided otherwise later
      ##
      # else
      #   all_os_color_print \
      #     "$(printf \
      #         "[-] Signing %s failed, quitting ...\n" \
      #         ${WIN_COMPILE_NATIVE_BIN_OUTPUT})" \
      #     "alert"
      #   exit -1
      #
      # fi

    else
      all_os_color_print \
        "$(printf \
            "[-] %s -> %s compilation failed, quitting ...\n" \
            ${WIN_COMPILE_NATIVE_BIN_SOURCE} \
            ${WIN_COMPILE_NATIVE_BIN_OUTPUT})" \
        "alert"
      exit -1
    fi

  else
    all_os_color_print \
      "[+] Skipping Python -> EXE compilation ...\n"
    printf "\n"

    powershell \
      -NoProfile \
      -InputFormat None \
      -ExecutionPolicy Bypass \
      "${WIN_NATIVE_BIN_INSTALLER}" \
        -DebugDirBase native
  fi

  printf "True\n"
}

##################################################################
# Prepare required build $PATH on Windows.
#
# Globals:
#   WIN_PREREQUISITES
#   WIN_WHICH_BIN_PATH
#   WIN_CYGPATH_BIN_PATH
# Returns:
#   "True" if target PyInstaller is found on Windows
#   "False" if target PyInstaller is not found on Windows
##################################################################
windows_prepare_path() {
  WIN_WHICH_BIN_PATH="$(\
    windows_find_path_with_powershell "which.exe")"

  WIN_CYGPATH_BIN_PATH="$(\
    windows_find_path_with_powershell "cygpath.exe")"

  WIN_WHICH_BIN_PATH="$(\
    windows_convert_to_unix_path "${WIN_WHICH_BIN_PATH}")"

  if [ -x "${WIN_WHICH_BIN_PATH}" ]; then
    all_os_color_print \
      "$(printf \
          "[+] which.exe binary found at: %s\n" \
          "${WIN_WHICH_BIN_PATH}")"
  else
    all_os_color_print \
      "[-] which.exe binary not found, quitting ...\n" \
      "alert"
    exit -1
  fi

  WIN_CYGPATH_BIN_PATH="$(\
    windows_convert_to_unix_path "${WIN_CYGPATH_BIN_PATH}")"

  if [ -x "${WIN_CYGPATH_BIN_PATH}" ]; then
    all_os_color_print \
      "$(printf \
        "[+] cygpath.exe binary found at: %s\n" \
        "${WIN_CYGPATH_BIN_PATH}")"
  else
    all_os_color_print \
      "[-] cygpath.exe binary not found, quitting ...\n" \
      "alert"
    exit -1
  fi

  local win_npm_bin_path="$(\
    windows_find_path_with_mingw npm)"

  if [ "${win_npm_bin_path}" = "NULL" ]; then
    all_os_color_print \
      "[-] 'npm' binary not found, quitting ...\n" \
      "alert"
    exit -1
  fi

  local win_npm_bin_dir="$(windows_convert_to_unix_path \
    "$("${win_npm_bin_path}" bin)")"

  if [ "$(all_os_is_windows_mingw)" = "True" ]; then
    all_os_color_print \
      "[+] Cross-checking Windows prerequisites ...\n" \

    for bin in ${WIN_PREREQUISITES}; do
      windows_check_prerequisite "${bin}"
    done
  fi

  local path="${win_npm_bin_dir}:${PATH}"
  printf "\n${path}"
}

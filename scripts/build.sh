#!/bin/sh
#
# Main build script for Tridactyl.

set -e


##################################################################
# Import necessary librares based on the underlying operating
# system where the build script is running.
#
# Globals:
#   None
# Arguments:
#   None
# Returns:
#   None
##################################################################
import_build_library(){
  . scripts/build-library-all-os.sh
  all_os_color_print "    - Importing library common for all OS\n"

  if [ "$(all_os_is_windows_mingw)" = "True" ]; then
    all_os_color_print "    - Importing library for Windows"
    . scripts/build-library-windows.sh
  fi
}


##################################################################
# Prepare the $PATH environmental variable to invoke correct build
# related tools, scripts etc.
#
# Globals:
#   None
# Arguments:
#   None
# Returns:
#   None
##################################################################
prepare_build_path() {
  if [ "$(all_os_is_windows_mingw)" = "True" ]; then
    local path=$(windows_prepare_path | tail -n1)
  else
    local path=$(all_os_prepare_path | tail -n1)
  fi

  export "PATH=${path}"
}


##################################################################
# Process 'excmd' macros based on the underlying operating system
# where the build script is running.
#
# Globals:
#   None
# Arguments:
#   None
# Returns:
#   None
##################################################################
process_excmd_macros() {
  if [ "$(all_os_is_windows_mingw)" = "True" ]; then
    windows_process_excmd_macros
  else
    all_os_process_excmd_macros
  fi
}


##################################################################
# Install the native messenger binary based on the underlying
# operating system where the build script is running.
#
# Globals:
#   None
# Arguments:
#   None
# Returns:
#   None
##################################################################
install_native_messenger() {
  if [ "$(all_os_is_windows_mingw)" = "True" ]; then
    windows_install_native_messenger
  else
    all_os_install_native_messenger
  fi
}


##################################################################
# Main function entry-point.
#
# Globals:
#   None
# Arguments:
#   None
# Returns:
#   None
##################################################################
main() {
  import_build_library
  all_os_color_print "[+] Importing necessary build libraries ...\n"

  all_os_color_print "[+] Preparing build path ...\n"
  prepare_build_path

  all_os_color_print "[+] Preparing build directories ...\n"
  all_os_prepare_build_dirs

  all_os_color_print "[+] Processing 'excmd' macros ...\n"
  process_excmd_macros

  all_os_color_print "[+] Preparing markdown for new-tab ...\n"
  all_os_prepare_newtab

  all_os_color_print "[+] Preparing markdown for tutorial ...\n"
  all_os_prepare_tutorial

  all_os_color_print "[+] Preparing docs ...\n"
  all_os_prepare_docs

  all_os_color_print "[+] Preparing parser(s) ...\n"
  all_os_prepare_parser

  all_os_color_print "[+] Installing native messenger ...\n"
  install_native_messenger

  all_os_color_print "[+] Bundling assets ...\n"
  all_os_bundle_assets

  all_os_color_print "[+] Adding Git revision ...\n"
  all_os_add_git_version

  all_os_color_print "[+] Preparing CSS import(s) ...\n"
  all_os_bodge_css

  all_os_color_print "[+] Preparing authors list ...\n"
  all_os_prepare_authors

  all_os_color_print "[+] Adding cleanslate.css ...\n"
  all_os_add_cleanslate_css
}

main "$@"

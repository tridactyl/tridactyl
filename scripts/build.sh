#!/bin/sh
#
# Main build script for Tridactyl.

set -e

readonly VERBOSE_BUILD=

main() {
  . scripts/build-library-all-os.sh
  all_os_color_print "    - Importing library common for all OS\n"

  if [ "$(all_os_is_windows_mingw)" = "True" ]; then
    all_os_color_print "    - Importing library for Windows"
    . scripts/build-library-windows.sh
  fi
  all_os_color_print "[+] Importing necessary build libraries ...\n"


  all_os_color_print "[+] Preparing build path ...\n"
  if [ "$(all_os_is_windows_mingw)" = "True" ]; then
    local path=$(windows_prepare_path | tail -n1)
    readonly WIN_PYTHON_CMD="py -3"
  else
    local path="$(npm bin):${PATH}"
  fi
  export "PATH=${path}"


  all_os_color_print "[+] Preparing build directories ...\n"
  mkdir -v -p build
  mkdir -v -p build/static
  mkdir -v -p generated/static
  mkdir -v -p generated/static/clippy


  all_os_color_print "[+] Processing 'excmd' macros ...\n"
  $WIN_PYTHON_CMD scripts/excmds_macros.py


  all_os_color_print "[+] Preparing markdown for new-tab ...\n"
  scripts/newtab.md.sh


  all_os_color_print "[+] Preparing markdown for tutorial ...\n"
  scripts/make_tutorial.sh


  all_os_color_print "[+] Preparing docs ...\n"
  scripts/make_docs.sh


  all_os_color_print "[+] Preparing parser(s) ...\n"
  $(npm bin)/nearleyc src/grammars/bracketexpr.ne \
    > src/grammars/.bracketexpr.generated.ts


  all_os_color_print "[+] Installing native messenger ...\n"
  if [ "$(all_os_is_windows_mingw)" = "True" ]; then
    windows_install_native_messenger
  else
    native/install.sh local
  fi

  all_os_color_print "[+] Bundling assets ...\n"
  webpack --display errors-only

  all_os_color_print "[+] Adding Git revision ...\n"
  scripts/git_version.sh

  all_os_color_print "[+] Preparing CSS import(s) ...\n"
  scripts/bodgecss.sh

  all_os_color_print "[+] Preparing authors list ...\n"
  scripts/authors.sh

  all_os_color_print "[+] Adding cleanslate.css ...\n"
  if [ -e "${CLEANSLATE}" ] ; then
    cp "${CLEANSLATE}" build/static/css/cleanslate.css
  else
    printf "%s" \
      "Couldn't find cleanslate.css. Try running 'npm install'"
  fi

}

main "$@"

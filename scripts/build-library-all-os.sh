#!/bin/sh
#
# Library of Tridactyl build functions common for all OS.

set -e

##################################################################
# Read-only global variable(s)
##################################################################
readonly NATIVE_DIR_NAME="native"
readonly CLEANSLATE="node_modules/cleanslate/docs/files/cleanslate.css"


####################################################################
# Prepare path for the build system.
#
# Globals:
#   None
# Arguments:
#   None
# Returns:
#   Modified new path.
##################################################################
all_os_prepare_path() {
  printf "$(npm bin):${PATH}"
}


###################################################################
# Detect if the build is running under MSYS2 or MinGW on a Windows
# operating system.
#
# Globals:
#   None
# Arguments:
#   None
# Returns:
#   "True" if running under MinGW or MSYS.
#   "False" otherwise.
##################################################################
all_os_is_windows_mingw() {
  local is_mingw="False"

  if [ "$(uname | cut -c 1-5)" = "MINGW" ] \
    || [ "$(uname | cut -c 1-4)" = "MSYS" ]; then
    is_mingw="True"
  fi

  printf "${is_mingw}"
}


####################################################################
# Prepare necessary directories for the build system.
#
# Globals:
#   None
# Arguments:
#   None
# Returns:
#   None
##################################################################
all_os_prepare_build_dirs() {
  mkdir -v -p build
  mkdir -v -p build/static
  mkdir -v -p generated/static
  mkdir -v -p generated/static/clippy
}

####################################################################
# Combine newtab markdown and template.
#
# Globals:
#   None
# Arguments:
#   None
# Returns:
#   None
##################################################################
all_os_prepare_newtab() {
  scripts/newtab.md.sh
}


##################################################################
# Combine newtab markdown and template.
#
# Globals:
#   None
# Arguments:
#   None
# Returns:
#   None
##################################################################
all_os_prepare_tutorial() {
  scripts/make_tutorial.sh
}


##################################################################
# Prepare documentations.
#
# Globals:
#   None
# Arguments:
#   None
# Returns:
#   None
##################################################################
all_os_prepare_docs() {
  scripts/make_docs.sh
}


##################################################################
# Prepare the parser(s).
#
# Globals:
#   None
# Arguments:
#   None
# Returns:
#   None
##################################################################
all_os_prepare_parser() {
  $(npm bin)/nearleyc src/grammars/bracketexpr.ne \
    > src/grammars/.bracketexpr.generated.ts
}


##################################################################
# Install native messenger binary on the build system.
#
# Globals:
#   None
# Arguments:
#   None
# Returns:
#   None
##################################################################
all_os_install_native_messenger() {
  native/install.sh local
}


##################################################################
# Bundle assets
#
# Globals:
#   None
# Arguments:
#   None
# Returns:
#   None
##################################################################
all_os_bundle_assets() {
  webpack --display errors-only
}


##################################################################
# Add Git revisions to the build output file(s).
#
# Globals:
#   None
# Arguments:
#   None
# Returns:
#   None
##################################################################
all_os_add_git_version() {
  scripts/git_version.sh
}


##################################################################
# Add CSS imports.
#
# Globals:
#   None
# Arguments:
#   None
# Returns:
#   None
##################################################################
all_os_bodge_css() {
  scripts/bodgecss.sh
}


##################################################################
# Prepare the list of contributors.
#
# Globals:
#   None
# Arguments:
#   None
# Returns:
#   None
##################################################################
all_os_prepare_authors() {
  scripts/authors.sh
}


##################################################################
# Add 'cleanslate.css'
#
# Globals:
#   None
# Arguments:
#   None
# Returns:
#   None
##################################################################
all_os_add_cleanslate_css() {
  if [ -e "${CLEANSLATE}" ] ; then
    cp -v "${CLEANSLATE}" build/static/css/cleanslate.css
  else
    printf "%s" \
      "Couldn't find cleanslate.css. Try running 'npm install'"
  fi
}


##################################################################
# Process 'excmd' macros
#
# Globals:
#   None
# Arguments:
#   None
# Returns:
#   None
##################################################################
all_os_process_excmd_macros() {
  scripts/excmds_macros.py
}


##################################################################
# Strips whitespace(s) from the specified string.
#
# Globals:
#   None
# Arguments:
#   $1 is the input string to be stripped
# Returns:
#   Whitespace stripped version of the input string
##################################################################
all_os_strip_whitespace() {
  local input="$@"
  print "${input}" | tr -d "[:space:]"
}


##################################################################
# Print the input string in color using either ${COLOR_GOOD} or
# ${COLOR_BAD}.
#
# Globals:
#   COLOR_BAD
#   COLOR_BOLD
#   COLOR_GOOD
#   COLOR_RESET
# Arguments:
#   $1 is the input string, printed in ${COLOR_GOOD}.
#   $2 if set to "alert", $1 is printed in ${COLOR_BAD}.
# Returns:
#   Print the colored input string.
##################################################################
all_os_color_print() {
  if [ $VERBOSE_BUILD ]; then
      local str="$1"
      local color="${COLOR_GOOD}${COLOR_BOLD}"

      if [ ! -z "$2" ] \
        && [ "$(all_os_strip_whitespace "$2")" = "alert" ]; then
        color="${COLOR_BAD}${COLOR_BOLD}"
      fi

      printf "${color}${str}${COLOR_RESET}"
  fi
}

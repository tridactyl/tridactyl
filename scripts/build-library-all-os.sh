#!/bin/sh
#
# Library of Tridactyl build functions common for all OS.

set -e

##################################################################
# Read-only global variable(s)
##################################################################
readonly NATIVE_DIR_NAME="native"
readonly CLEANSLATE="node_modules/cleanslate/docs/files/cleanslate.css"


###################################################################
# Detect if the build is running under MSYS2 or MinGW on a Windows
# operating system.
#
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


##################################################################
# Strips whitespace(s) from the specified string.
#
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
# Don't print anything unless VERBOSE_BUILD is set.
#
# Globals:
#   COLOR_BAD
#   COLOR_BOLD
#   COLOR_GOOD
#   COLOR_RESET
#   VERBOSE_BUILD
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

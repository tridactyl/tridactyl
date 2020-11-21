#!/usr/bin/env sh

echoerr() {
    red="\\033[31m"
    normal="\\e[0m"
    printf "%b\n" "$red$*$normal" >&2
}

sedEscape() {
    printf "%s" "$@" | sed 's/[&/\]/\\&/g'
}

# To install, curl -fsSl 'url to this script' | sh

run() {
    set -e

    XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}/tridactyl"
    XDG_DATA_HOME="${XDG_DATA_HOME:-$HOME/.local/share}/tridactyl"

    # Use argument as version or 1.15.0, as that was the last version before we switched to using tags
    manifest_loc="https://raw.githubusercontent.com/tridactyl/tridactyl/${1:+-1.15.0}/native/tridactyl.json"
    native_loc="https://raw.githubusercontent.com/tridactyl/tridactyl/${1:+-1.15.0}/native/native_main.py"

    # Decide where to put the manifest based on OS
    # Get OSTYPE from bash if it's installed. If it's not, then this will
    # default to the Linux location as OSTYPE will be empty
    OSTYPE="$(command -v bash >/dev/null && bash -c 'echo $OSTYPE')"
    case "$OSTYPE" in
        linux-gnu|linux-musl|linux|freebsd*)
            manifest_home="$HOME/.mozilla/native-messaging-hosts/"
            ;;
        darwin*)
            manifest_home="$HOME/Library/Application Support/Mozilla/NativeMessagingHosts/"
            ;;
        *)
            # Fallback to default Linux location for unknown OSTYPE
            manifest_home="$HOME/.mozilla/native-messaging-hosts/"
            ;;
    esac

    mkdir -p "$manifest_home" "$XDG_DATA_HOME"

    manifest_file="$manifest_home/tridactyl.json"
    native_file="$XDG_DATA_HOME/native_main.py.new"
    native_file_final="$XDG_DATA_HOME/native_main.py"

    echo "Installing manifest here: $manifest_home"
    echo "Installing script here: XDG_DATA_HOME: $XDG_DATA_HOME"

    # Until this PR is merged into master, we'll be copying the local version
    # over instead of downloading it
    if [ "$1" = "local" ]; then
        cp -f native/tridactyl.json "$manifest_file"
        cp -f native/native_main.py "$native_file"
    else
        curl -sS --create-dirs -o "$manifest_file" "$manifest_loc"
        curl -sS --create-dirs -o "$native_file" "$native_loc"
    fi

    if [ ! -f "$manifest_file" ] ; then
        echoerr "Failed to create '$manifest_file'. Please make sure that the directories exist and that you have the necessary permissions."
        exit 1
    fi

    if [ ! -f "$native_file" ] ; then
        echoerr "Failed to create '$native_file'. Please make sure that the directories exist and that you have the necessary permissions."
        exit 1
    fi

    sed -i.bak "s/REPLACE_ME_WITH_SED/$(sedEscape "$native_file_final")/" "$manifest_file"
    chmod +x "$native_file"

    # Requirements for native messenger
    python_path=$(command -v python3) || python_path=""
    if [ -x "$python_path" ]; then
        sed -i.bak "1s/.*/#!$(sedEscape /usr/bin/env) $(sedEscape "$python_path")/" "$native_file"
        mv "$native_file" "$native_file_final"
    else
        echoerr "Error: Python 3 must exist in PATH."
        echoerr "Please install it and run this script again."
        exit 1
    fi

    echo
    echo "Successfully installed Tridactyl native messenger!"
    echo "Run ':native' in Firefox to check."
}

# Run the run function in a subshell so that it can be exited early if an error
# occurs
if ret="$(run "$@")"; then
    # Print captured output
    printf "%b\n" "$ret"
else
    # Print captured output, ${ret:+\n} adds a newline only if ret isn't empty
    printf "%b" "$ret${ret:+\n}"
    echoerr 'Failed to install!'
fi

#!/usr/bin/env bash

# Accepts no arguments
# Returns git-add'ed files as a list of filenames separated by a newline character
cachedTSLintFiles() {
    git diff --cached --name-only --diff-filter=ACM "*.ts" "*.tsx" ":(exclude)*.d.ts" ":(exclude)tests/*" ":(exclude)*test.ts" ":(exclude)e2e_tests/*"
}

# Accepts no arguments
# Returns git-add'ed files as a list of filenames separated by a newline character
cachedPrettierFiles() {
    git diff --cached --name-only --diff-filter=ACM "*.md" "*.css"
}

# Accepts a single argument which is the name of a file tracked by git
# Returns a string which is the content of the file as stored in the git index
staged() {
    git show :"$1"
}

# Accepts a single string argument made of multiple file names separated by a newline
# Returns an array of files that prettier wants to lint
prettierUgly() {
    local acc=""
    local IFS=$'\n'
    for jsfile in $1; do
        diff <(staged "$jsfile") <(staged "$jsfile" | "$(yarn bin)/prettier" --stdin-filepath "$jsfile") >/dev/null || acc="$jsfile"$'\n'"$acc"
    done
    echo "$acc"
}

eslintUgly() {
    local acc=""
    local IFS=$'\n'
    local tmpdir

    mkdir -p ".tmp"
    if [[ "$(uname)" == "Darwin" ]]; then
        tmpdir=$(gmktemp --tmpdir=".tmp/" -d "tslint.XXXXXXXXX")
    else
        tmpdir=$(mktemp --tmpdir=".tmp/" -d "tslint.XXXXXXXXX")
    fi

    for jsfile in "$@"; do
        tmpfile="$tmpdir/$jsfile"
        mkdir -p "$(dirname "$tmpfile")"
        staged "$jsfile" > "$tmpfile"
        "$(yarn bin)/eslint" --rulesdir custom-eslint-rules --no-ignore --quiet -o /dev/null "$tmpfile" || acc="$jsfile"$'\n'"$acc"
    done
    rm -rf "$tmpdir"
    echo "$acc"
}

noisy() {
    local acc=()
    for jsfile in "$@"; do
        if [ "$(git diff --cached "$jsfile" | grep '^+.*console.log' -c)" -gt '0' ] ; then
            acc+=("jsfile")
        fi
    done
    echo "${acc[@]}"
}

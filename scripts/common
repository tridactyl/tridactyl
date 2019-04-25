#!/usr/bin/env bash

# Accepts no arguments
# Returns git-add'ed files as a list of filenames separated by a newline character
cachedTSLintFiles() {
    git diff --cached --name-only --diff-filter=ACM "*.js" "*.jsx" "*.ts" "*.tsx" ":(exclude)*.d.ts" ":(exclude)tests/*"
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
        diff <(staged "$jsfile") <(staged "$jsfile" | "$(npm bin)/prettier" --stdin-filepath "$jsfile") >/dev/null || acc="$jsfile"$'\n'"$acc"
    done
    echo "$acc"
}

tslintUgly() {
    local acc=""
    local IFS=$'\n'
    local tmpdir=$(mktemp -d "tslint.XXXXXXXXX")
    for jsfile in "$@"; do
        tmpfile="$tmpdir/$jsfile"
        mkdir -p "$(dirname "$tmpfile")"
        staged "$jsfile" > "$tmpfile"
        tslint -q "$tmpfile" 2>/dev/null || acc="$jsfile"$'\n'"$acc"
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
    echo ${acc[@]}
}

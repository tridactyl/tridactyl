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

noisy() {
    local acc=""
    for jsfile in "$@"; do
        if [ "$(git diff --cached "$jsfile" | grep '^+.*console.log' -c)" -gt '0' ] ; then
            acc+="$acc$jsfile"$'\n'
        fi
    done
    echo "$acc"
}

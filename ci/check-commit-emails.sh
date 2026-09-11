#!/bin/sh
set -eu

authors=$(git log --format='%H%x09%an%x09%ae' "$BASE_SHA..$HEAD_SHA")
coauthors=$(git log --format='%H%x09%(trailers:key=Co-authored-by)' "$BASE_SHA..$HEAD_SHA")
bad_authors=$(printf '%s\n' "$authors" | grep -iE 'noreply' | grep -ivE 'dependabot(\[bot\])?' || true)
bad_coauthors=$(printf '%s\n' "$coauthors" | grep -iE 'noreply' || true)
if [ -n "$bad_authors$bad_coauthors" ]; then
    printf '%s\n%s\n' "$bad_authors" "$bad_coauthors"
    echo "'noreply' address found in patch. Please provide real contact details or ask a maintainer to adopt your commits."
    exit 1
fi

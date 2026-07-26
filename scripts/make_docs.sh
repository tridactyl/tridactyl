#!/bin/sh
set -e

dest=generated/static/docs
if revision=$(git rev-parse HEAD 2>/dev/null); then
    set -- --basePath src --disableGit --gitRevision "$revision" \
        --sourceLinkTemplate 'https://github.com/tridactyl/tridactyl/blob/{gitRevision}/src/{path}#L{line}'
else
    set -- --disableSources
fi
"$(yarn bin)/typedoc" --plugin ./scripts/typedoc-theme.mjs \
    --theme tridactyl --router tridactyl \
    "$@" \
    --entryPointStrategy expand --validation.notExported false \
    --excludePrivate false --excludePrivateClassFields false \
    --includeHierarchySummary false \
    --exclude "src/**/?(test_utils|*.test).ts" \
    --out "$dest" src
for command in next_completion prev_history accept_line; do
    grep -q "id=\"$command\"" "$dest/modules/_src_commandline_frame_.html"
done
rm -rf build/static/docs
cp -r "$dest" build/static/

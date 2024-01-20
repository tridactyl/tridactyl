#!/bin/sh

# Replace issue numbers in brackets eg (#1337) with a link to the issue on the repository
sed -i.bak 's; (#\([0-9]*\)); ([#\1](https://github.com/tridactyl/tridactyl/issues/\1));g' CHANGELOG.md

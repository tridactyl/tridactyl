#!/bin/sh
typedoc --out generated/static/docs/ src --ignoreCompilerErrors
./scripts/commandline_injector.sh generated/static/docs/modules/_excmds_.html

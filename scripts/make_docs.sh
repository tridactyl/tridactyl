#!/bin/sh
dest=generated/static/docs
typedoc --out $dest src --ignoreCompilerErrors
./scripts/commandline_injector.sh $dest/modules/_excmds_.html
cp -r $dest build/static/

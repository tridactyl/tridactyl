#!/bin/sh
dest=generated/static/docs
typedoc --out $dest src --ignoreCompilerErrors
find $dest -name \*.html -exec ./scripts/commandline_injector.sh '{}' \;
cp -r $dest build/static/

#!/bin/sh
dest=generated/static/docs
$(npm bin)/typedoc --theme src/static/typedoc/ --out $dest src --ignoreCompilerErrors
cp -r $dest build/static/

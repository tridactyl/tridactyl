#!/bin/sh
# nb this is also defined in the makedocs script
dest=generated/static/docs
yarn run makedocs
cp -r $dest build/static/

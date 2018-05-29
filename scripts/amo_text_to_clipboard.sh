#!/bin/sh

# Put the AMO flavour text in your clipboard for easy pasting. 
# AMO doesn't support all HTML in markdown so we strip it out.

$(npm bin)/marked doc/amo.md | sed -r "s/<.?p>//g" | sed -r "s/<.?h.*>//g" | xclip -selection "clipboard"

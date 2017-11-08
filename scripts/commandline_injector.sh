#!/usr/bin/env bash
shopt -s globstar
sed -i '/<\/body>/s/^/<script src="..\/..\/..\/content.js"><\/script>/' $1
#static/docs/modules/_excmds_.html
        

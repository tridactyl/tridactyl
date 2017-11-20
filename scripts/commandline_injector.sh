#!/usr/bin/env bash
shopt -s globstar
sed -i '/<\/body>/s@^@<script src="/content.js"></script><link rel="stylesheet" href="/static/content.css"><link rel="stylesheet" href="/static/hint.css">@' $1
#static/docs/modules/_excmds_.html

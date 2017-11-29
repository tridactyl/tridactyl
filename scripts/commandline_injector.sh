#!/usr/bin/env bash

sed -i.bak '/<\/body>/s@^@<script src="/content.js"></script><link rel="stylesheet" href="/static/content.css"><link rel="stylesheet" href="/static/hint.css">@' "$1"
rm "$1.bak"

#static/docs/modules/_excmds_.html

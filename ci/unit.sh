#! /bin/sh
cd ${0%/*}
"$(yarn bin)/jest" src

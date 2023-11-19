#!/bin/bash
# find earliest possible beta release tag for a given feature
# usage: ./when_feature.sh "text that appears in log"

# create array of commits that contain the line
commits=$(git log -S "$@" --oneline --all --reverse | cut -d ' ' -f 1)

# loop through commits until we find one that has a tag
for commit in $commits
do
    # get the tag for the commit
    tag=$(git describe --tags $commit 2> /dev/null)

    # if the commit has a tag, break out of the loop
    if [ -n "$tag" ]
    then
        break
    fi
done

prestr=pre$(git rev-list --count $commit)

# replace the middle number in tag-number-commit with prestr
# nb: there's an extra -g but I don't care enough
echo $tag | sed "s/\([^-]*\)-\([^-]*\)-\([^-]*\)/\1-$prestr-\3/"

#!/bin/sh

echo 'Replacing settings page static options'
page='build/static/settings.html'

marked doc/changelog.md > changelog.html
marked src/static/about.md > about.html

sed -e '/REPLACE_WITH_ABOUT_VIA_SED/{r about.html
       d;}' -i.bak $page
sed -e '/REPLACE_WITH_LICENSE_VIA_SED/{r LICENSE
       d;}' -i.bak $page
sed -e '/REPLACE_WITH_CHANGELOG_VIA_SED/{r changelog.html
       d;}' -i.bak $page
rm $page.bak about.html changelog.html
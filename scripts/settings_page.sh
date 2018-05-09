#!/bin/sh

echo 'Replacing settings page static options'

marked CHANGELOG.md > changelog.html
marked src/static/about.md > about.html
marked readme.md > readme.html

page='generated/static/settings.html'
cp 'src/static/settings.html' $page

sed -e '/REPLACE_WITH_ABOUT_VIA_SED/{r about.html
       d;}' -i.bak $page
sed -e '/REPLACE_WITH_LICENSE_VIA_SED/{r LICENSE
       d;}' -i.bak $page
sed -e '/REPLACE_WITH_CHANGELOG_VIA_SED/{r changelog.html
       d;}' -i.bak $page
sed -e '/REPLACE_WITH_README_VIA_SED/{r readme.html
       d;}' -i.bak $page
rm $page.bak about.html changelog.html readme.html

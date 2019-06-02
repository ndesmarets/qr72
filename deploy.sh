git checkout -B gh-pages
git add -f dist
git commit -am "Site internet mis a jour"
git filter-branch -f --prune-empty --subdirectory-filter dist
git push -f origin gh-pages
git checkout -
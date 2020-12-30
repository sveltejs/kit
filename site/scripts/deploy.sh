#!/bin/sh
HEAD=$(git symbolic-ref HEAD)
git symbolic-ref HEAD refs/heads/gh-pages
git reset $HEAD
git rm --cached -rf ..
cd __sapper__/export
find . -type f | cut -c 3- | xargs -I '{}' sh -c 'git update-index --add --cacheinfo 100644,$(git hash-object -w "{}"),"{}"'
git commit -m '[build site]'
git symbolic-ref HEAD $HEAD
git reset
git push -f origin gh-pages

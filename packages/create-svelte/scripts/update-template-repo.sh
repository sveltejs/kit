#!/bin/bash

get_abs_filename() {
  # $1 : relative filename
  echo "$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
}

DIR=$(get_abs_filename $(dirname "$0"))
TMP=$(get_abs_filename "$DIR/../node_modules/.tmp")

mkdir -p $TMP
cd $TMP

if [ "$CI" ]; then
	(umask 0077; echo "$UPDATE_TEMPLATE_SSH_KEY" > ~/ssh_key;)
	export GIT_SSH_COMMAND='ssh -o StrictHostKeyChecking=accept-new -i ~/ssh_key'
fi

# clone the template repo
rm -rf kit-template-default
git clone --depth 1 --single-branch --branch main git@github.com:sveltejs/kit-template-default.git kit-template-default

# empty out the repo
cd kit-template-default
node $DIR/update-template-repo-contents.js $TMP/kit-template-default

if [ "$CI" ]; then
	git config user.email 'noreply@svelte.dev'
	git config user.name '[bot]'
fi

# commit the new files
git add -A
git commit -m "version $npm_package_version"

git push git@github.com:sveltejs/kit-template-default.git main -f
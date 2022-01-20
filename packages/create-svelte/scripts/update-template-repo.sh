#!/bin/bash
cd "$(dirname "$0")"
DIR=$PWD
TMP="$DIR/../node_modules/.tmp"

echo "dir: $DIR"
echo "tmp: $TMP"

mkdir -p $TMP
cd $TMP

if [ "$CI" ]; then
	(umask 0077; echo "$SSH_KEY" > ~/ssh_key;)
	git config user.email 'noreply@svelte.dev'
	git config user.name '[bot]'
fi

export GIT_SSH_COMMAND='ssh -o StrictHostKeyChecking=accept-new -i ~/ssh_key'

rm -rf $DIR/kit-template-default
git clone --depth 1 --single-branch --branch main git@github.com:sveltejs/kit-template-default.git
node $DIR/update-template-repo-contents.js
# git push git@github.com:sveltejs/kit-template-default.git main -f
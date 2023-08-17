import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { assert, expect, test } from 'vitest';
import { replace_hydration_attrs } from '../../test-utils';

const build = fileURLToPath(new URL('../build', import.meta.url));

/** @param {string} file */
const read = (file) => fs.readFileSync(`${build}/${file}`, 'utf-8');

test('prerenders /path-base', () => {
	const content = replace_hydration_attrs(read('index.html'));
	expect(content).toMatch('<h1>hello</h1>');
});

test('prerenders nested /path-base', () => {
	const content = replace_hydration_attrs(read('nested/index.html'));
	expect(content).toMatch('<h1>nested hello</h1>');
});

test('adds CSP headers via meta tag', () => {
	const content = read('index.html');
	expect(content).toMatch(
		'<meta http-equiv="content-security-policy" content="script-src \'self\' \'sha256-'
	);
});

test('does not copy `public` into `_app`', () => {
	assert.isFalse(fs.existsSync(`${build}/_app/robots.txt`));
});

// https://github.com/sveltejs/kit/issues/4340
test('populates fallback 200.html file', () => {
	const content = read('200.html');
	assert.isNotEmpty(content);
});

test('does not prerender linked +server.js route', () => {
	assert.isFalse(fs.existsSync(`${build}/rss.xml`));
});

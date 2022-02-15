import fs from 'fs';
import { fileURLToPath } from 'url';
import { test } from 'uvu';
import * as assert from 'uvu/assert';

const build = fileURLToPath(new URL('../build', import.meta.url));

/** @param {string} file */
const read = (file) => fs.readFileSync(`${build}/${file}`, 'utf-8');

test('prerenders /path-base', () => {
	const content = read('index.html');
	assert.ok(content.includes('<h1>hello</h1>'));
	assert.ok(content.includes('http://sveltekit-prerender/path-base'));
});

test('prerenders nested /path-base', () => {
	const content = read('nested/index.html');
	assert.ok(content.includes('<h1>nested hello</h1>'));
	assert.ok(content.includes('http://sveltekit-prerender/path-base/nested'));
});

test('adds CSP headers via meta tag', () => {
	const content = read('index.html');
	assert.ok(
		content.includes(
			'<meta http-equiv="content-security-policy" content="script-src \'self\' \'sha256-'
		)
	);
});

test.run();

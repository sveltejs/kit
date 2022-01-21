import fs from 'fs';
import { fileURLToPath } from 'url';
import { test } from 'uvu';
import * as assert from 'uvu/assert';

const build = fileURLToPath(new URL('../build', import.meta.url));

/** @param {string} file */
const read = (file) => fs.readFileSync(`${build}/${file}`, 'utf-8');

test('prerenders /', () => {
	const content = read('index.html');
	assert.ok(content.includes('<h1>hello</h1>'));
});

test('renders a redirect', () => {
	const content = read('redirect/index.html');
	assert.equal(
		content,
		'<meta http-equiv="refresh" content="0;url=https://example.com/redirected">'
	);
});

test('does not double-encode redirect locations', () => {
	const content = read('redirect-encoded/index.html');
	assert.equal(
		content,
		'<meta http-equiv="refresh" content="0;url=https://example.com/redirected?returnTo=%2Ffoo%3Fbar%3Dbaz">'
	);
});

test('escapes characters in redirect', () => {
	const content = read('redirect-malicious/index.html');
	assert.equal(
		content,
		'<meta http-equiv="refresh" content="0;url=https://example.com/&lt;/script&gt;alert(&quot;pwned&quot;)">'
	);
});

test('inserts http-equiv tag for cache-control headers', () => {
	const content = read('max-age/index.html');
	assert.ok(content.includes('<meta http-equiv="cache-control" content="max-age=300">'));
});

test.run();

import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { test } from 'uvu';
import * as assert from 'uvu/assert';

const build = fileURLToPath(new URL('../build', import.meta.url));

/** @param {string} file */
const read = (file) => fs.readFileSync(`${build}/${file}`, 'utf-8');

test('prerenders /path-base', () => {
	const content = read('index.html');
	assert.ok(content.includes('/path-base/favicon.png') && content.includes('/path-base/nested'));
});

test('prerenders /path-base/redirect', () => {
	const content = read('redirect.html');
	assert.equal(content, '<meta http-equiv="refresh" content="0;url=/path-base/dynamic/foo">');
});

test('prerenders /path-base/dynamic/foo', () => {
	const content = read('dynamic/foo.html');
	assert.ok(content.includes('<h1>foo</h1>'));
});

test('prerenders /path-base/assets', () => {
	const content = read('assets.html');
	assert.match(content, /<img[^>]+src="\/path-base\//u);
});

test.run();

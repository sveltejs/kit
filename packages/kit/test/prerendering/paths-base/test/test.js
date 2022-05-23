import fs from 'fs';
import { fileURLToPath } from 'url';
import { test } from 'uvu';
import * as assert from 'uvu/assert';

const build = fileURLToPath(new URL('../build', import.meta.url));

/** @param {string} file */
const read = (file) => fs.readFileSync(`${build}/${file}`, 'utf-8');

test('prerenders /path-base', () => {
	const content = read('index.html');
	assert.equal(content, '<meta http-equiv="refresh" content="0;url=/path-base/dynamic/foo">');
});

test('prerenders /path-base/dynamic/foo', () => {
	const content = read('dynamic/foo.html');
	assert.ok(content.includes('<h1>foo</h1>'));
});

test.run();

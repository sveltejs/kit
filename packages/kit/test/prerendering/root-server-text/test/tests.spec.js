import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { assert, expect, test } from 'vitest';

const build = fileURLToPath(new URL('../build', import.meta.url));

/** @param {string} file */
const read = (file) => fs.readFileSync(`${build}/${file}`, 'utf-8');

test('prerenders root +server.js endpoint with text/plain as index.txt', () => {
	// The root +server.js with text/plain should be saved as index.txt, not index.html
	assert.isTrue(fs.existsSync(`${build}/index.txt`), 'index.txt should exist');
	assert.isFalse(fs.existsSync(`${build}/index.html`), 'index.html should NOT exist');
	
	const content = read('index.txt');
	expect(content).toBe('Root server endpoint returning plain text');
});
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { assert, expect, test } from 'vitest';

const build = fileURLToPath(new URL('../build', import.meta.url));

/** @param {string} file */
const read = (file) => fs.readFileSync(`${build}/${file}`, 'utf-8');

test('prerenders root +server.js endpoint with correct extension', () => {
	// The root +server.js should be saved as index.json, not index.html
	assert.isTrue(fs.existsSync(`${build}/index.json`), 'index.json should exist');
	assert.isFalse(fs.existsSync(`${build}/index.html`), 'index.html should NOT exist');
	
	const content = read('index.json');
	expect(content).toBe('{"message":"Root server endpoint returning JSON"}');
});

test('prerenders nested HTML pages correctly', () => {
	// Nested pages should still work correctly
	assert.isTrue(fs.existsSync(`${build}/nested.html`), 'nested.html should exist');
	const content = read('nested.html');
	expect(content).toMatch('<h1>Nested page that should be prerendered</h1>');
});
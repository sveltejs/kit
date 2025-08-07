import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { assert, expect, test } from 'vitest';

const build = fileURLToPath(new URL('../build', import.meta.url));

/** @param {string} file */
const read = (file) => fs.readFileSync(`${build}/${file}`, 'utf-8');

test('prerenders root +server.js endpoint with non-HTML content-type with appropriate filename', () => {
	// The root +server.js with application/json should be saved as index.json
	assert.isTrue(fs.existsSync(`${build}/index.json`), 'index.json should exist');
	assert.isFalse(fs.existsSync(`${build}/index.html`), 'index.html should NOT exist');
	
	const content = read('index.json');
	expect(content).toBe('{"message":"Root endpoint returning JSON"}');
});

test('prerenders nested +server.js endpoint with non-HTML content-type and no extension on parent directory with appropriate filename', () => {
	// The /root-text +server.js with text/plain should be saved as root-text/index.txt
	assert.isTrue(fs.existsSync(`${build}/root-text/index.txt`), 'root-text/index.txt should exist');
	assert.isFalse(fs.existsSync(`${build}/root-text/index.html`), 'root-text/index.html should NOT exist');
	
	const rootTextContent = read('root-text/index.txt');
	expect(rootTextContent).toBe('Root-text endpoint returning plain text');
	
	// The /text +server.js with text/plain should be saved as text/index.txt
	assert.isTrue(fs.existsSync(`${build}/text/index.txt`), 'text/index.txt file should exist');
	assert.isFalse(fs.existsSync(`${build}/text.html`), 'text.html should NOT exist');
	assert.isTrue(fs.statSync(`${build}/text`).isDirectory(), 'text should be a directory');
	
	const textContent = read('text/index.txt');
	expect(textContent).toBe('Root server endpoint returning plain text');
	
	// The /json +server.js should be saved as json/index.json
	assert.isTrue(fs.existsSync(`${build}/json/index.json`), 'json/index.json file should exist');
	assert.isFalse(fs.existsSync(`${build}/json.html`), 'json.html should NOT exist');
	assert.isTrue(fs.statSync(`${build}/json`).isDirectory(), 'json should be a directory');
	
	const jsonContent = read('json/index.json');
	expect(jsonContent).toBe('{"message":"Root server endpoint returning JSON"}');
});

test('prerenders nested +server.js endpoint with extension already in directory name', () => {
	// The /api.json/+server.js should be saved as api.json (not api.json.json)
	assert.isTrue(fs.existsSync(`${build}/api.json`), 'api.json file should exist');
	assert.isFalse(fs.existsSync(`${build}/api.json.json`), 'api.json.json should NOT exist');
	assert.isFalse(fs.existsSync(`${build}/api.json/index.json`), 'api.json/index.json should NOT exist');
	
	const content = read('api.json');
	expect(content).toBe('{"message":"API endpoint with .json in path"}');
});

test('prerenders redirects from paths with extensions correctly', () => {
	// Redirect from /data.json should create data.json/index.html, not data.json.html
	assert.isTrue(fs.existsSync(`${build}/data.json/index.html`), 'data.json/index.html should exist');
	assert.isFalse(fs.existsSync(`${build}/data.json.html`), 'data.json.html should NOT exist');
	
	const content = read('data.json/index.html');
	expect(content).toContain('location.href="/api.json"');
	
	// Redirect from /redirect-json (no extension) should create redirect-json.html
	assert.isTrue(fs.existsSync(`${build}/redirect-json.html`), 'redirect-json.html should exist');
	const redirectContent = read('redirect-json.html');
	expect(redirectContent).toContain('location.href="/json"');
});

test('prerenders nested HTML pages correctly', () => {
	// Nested pages should still work correctly
	assert.isTrue(fs.existsSync(`${build}/nested.html`), 'nested.html should exist');
	const content = read('nested.html');
	expect(content).toMatch('<h1>Nested page that should be prerendered</h1>');
});

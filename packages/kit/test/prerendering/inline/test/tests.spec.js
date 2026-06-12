import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { assert, expect, test } from 'vitest';

const build = fileURLToPath(new URL('../build', import.meta.url));

/** @param {string} file */
const read = (file) => fs.readFileSync(`${build}/${file}`, 'utf-8');

const emitted = () =>
	fs.existsSync(`${build}/_app`)
		? fs.readdirSync(`${build}/_app`, { recursive: true }).map(String)
		: [];

test('inlines the bundle and stylesheet into the page', () => {
	const content = read('index.html');
	expect(content).toMatch('everything is inlined');
	expect(content).toMatch('teal');
});

test('does not emit the bundle or stylesheet files', () => {
	const files = emitted();
	assert.isFalse(files.some((file) => file.includes('bundle.')));
	assert.isFalse(files.some((file) => file.includes('style.')));
});

test('omits inlined files from the service worker build list', () => {
	const content = read('service-worker.js');
	expect(content).not.toMatch('immutable');
});

test('still emits version.json', () => {
	assert.isTrue(fs.existsSync(`${build}/_app/version.json`));
});

test('emits a fallback page with the app inlined', () => {
	const content = read('200.html');
	expect(content).toMatch('__sveltekit_');
	expect(content).not.toMatch('<script src');
});

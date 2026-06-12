import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { assert, expect, test } from 'vitest';

const build = fileURLToPath(new URL('../build', import.meta.url));

/** @param {string} file */
const read = (file) => fs.readFileSync(`${build}/${file}`, 'utf-8');

test('inlines static public env vars into prerendered pages', () => {
	const content = read('index.html');
	expect(content).toMatch('<h1>the static message</h1>');
});

test('does not import env.js from prerendered pages', () => {
	const content = read('index.html');
	expect(content).not.toMatch('_app/env.js');
});

test('does not emit env.js or env.script.js', () => {
	assert.isFalse(fs.existsSync(`${build}/_app/env.js`));
	assert.isFalse(fs.existsSync(`${build}/_app/env.script.js`));
});

test('does not load env.script.js in the service worker', () => {
	const content = read('service-worker.js');
	expect(content).not.toMatch('env.script.js');
	expect(content).toMatch('the static message');
});

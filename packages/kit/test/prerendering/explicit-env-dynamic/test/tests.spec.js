import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const build = fileURLToPath(new URL('../build', import.meta.url));

/** @param {string} file */
const read = (file) => fs.readFileSync(`${build}/${file}`, 'utf-8');

test('prerendered pages load env.js before starting the app', () => {
	const content = read('index.html');
	expect(content).toMatch('_app/env.js');
});

test('emits env.js with the values of dynamic public env vars', () => {
	const content = read('_app/env.js');
	expect(content).toMatch('the runtime message');
	expect(content).not.toMatch('the static message');
});

test('emits env.script.js with the values of dynamic public env vars', () => {
	const content = read('_app/env.script.js');
	expect(content).toMatch('the runtime message');
	expect(content).not.toMatch('the static message');
});

test('loads env.script.js in the service worker', () => {
	const content = read('service-worker.js');
	expect(content).toMatch('_app/env.script.js');
});

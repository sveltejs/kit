import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { replace_hydration_attrs } from '../../test-utils';

const build = fileURLToPath(new URL('../build', import.meta.url));

/** @param {string} file */
const read = (file) => fs.readFileSync(`${build}/${file}`, 'utf-8');

test('prerenders /', () => {
	const content = replace_hydration_attrs(read('index.html'));
	expect(content).toContain('<a href="/en">English</a>');
});

test('prerenders nested /en', () => {
	const content = replace_hydration_attrs(read('en.html'));
	expect(content).toContain('<a href="/en">English</a>');
});


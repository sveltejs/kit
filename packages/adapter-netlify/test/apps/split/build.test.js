import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from 'vitest';

test('_redirects are copied to publish directory', () => {
	const redirects = fs.readFileSync(
		path.resolve(import.meta.dirname, './build/_redirects'),
		'utf-8'
	);
	expect(redirects).toContain('/redirect-me /greeting/redirected 301');
});

const functions_dir = path.resolve(import.meta.dirname, './.netlify/v1/functions');

/** @param {(content: string) => boolean} filter */
function read_functions(filter) {
	return fs
		.readdirSync(functions_dir)
		.filter((f) => f.startsWith('sveltekit-') && f.endsWith('.mjs'))
		.map((f) => fs.readFileSync(path.join(functions_dir, f), 'utf-8'))
		.filter(filter);
}

test('split generates multiple function files', () => {
	const functions = read_functions((content) =>
		content.includes('path: ["/collection/:param1?/article"')
	);
	expect(functions.length).toBe(1);
	expect(functions[0]).toContain(
		'path: ["/collection/:param1?/article", "/collection/:param1?/article/__data.json"]'
	);
});

test('functions have human friendly display names', () => {
	const functions = read_functions((content) =>
		content.includes('path: ["/collection/:param1?/article"')
	);
	expect(functions[0]).toContain('name: "SvelteKit /collection/[[optional]]/article"');

	const catch_all = read_functions((content) => content.includes('path: ["/*"]'));
	expect(catch_all.length).toBe(1);
	expect(catch_all[0]).toContain('name: "SvelteKit catch-all"');
});

test('routes that sanitize to the same pattern generate separate functions', () => {
	const foo_dot = read_functions((content) => content.includes('path: ["/collision/foo.bar"'));
	const foo_bar = read_functions((content) => content.includes('path: ["/collision/foo_bar"'));

	expect(foo_dot.length).toBe(1);
	expect(foo_bar.length).toBe(1);
	expect(foo_dot[0]).toContain('name: "SvelteKit /collision/foo.bar"');
	expect(foo_bar[0]).toContain('name: "SvelteKit /collision/foo_bar"');
});

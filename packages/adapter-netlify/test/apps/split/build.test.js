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

const functions_dirs = {
	node: path.resolve(import.meta.dirname, './.netlify/v1/functions'),
	edge: path.resolve(import.meta.dirname, './.netlify/v1/edge-functions')
};

const config_path = path.resolve(import.meta.dirname, './.netlify/v1/config.json');

test('generates Node.js and Edge functions', () => {
	const config = JSON.parse(fs.readFileSync(config_path, 'utf-8'));
	expect(config).not.toHaveProperty('nodeVersion');
	expect(fs.existsSync(functions_dirs.node)).toBe(true);
	expect(fs.existsSync(functions_dirs.edge)).toBe(true);

	const inherited = read_functions('node', (content) =>
		content.includes('"name": "SvelteKit /collision/foo.bar"')
	);
	expect(inherited).toHaveLength(1);
	expect(inherited[0]).not.toContain('"nodeVersion"');

	const explicit = read_functions('node', (content) =>
		content.includes('"name": "SvelteKit /greeting/[name]"')
	);
	expect(explicit).toHaveLength(1);
	expect(explicit[0]).toContain('"nodeVersion": "24"');
});

/**
 * @param {'node' | 'edge'} runtime
 * @param {(content: string) => boolean} filter
 */
function read_functions(runtime, filter) {
	return fs
		.readdirSync(functions_dirs[runtime])
		.filter((f) => f.startsWith('sveltekit-') && f.endsWith(runtime === 'edge' ? '.js' : '.mjs'))
		.map((f) => fs.readFileSync(path.join(functions_dirs[runtime], f), 'utf-8'))
		.filter(filter);
}

test('split generates multiple function files', () => {
	const functions = read_functions('edge', (content) =>
		content.includes('"name": "SvelteKit /collection/[[optional]]/article"')
	);
	expect(functions.length).toBe(1);
	expect(functions[0]).not.toContain('"nodeVersion"');
	expect(functions[0]).toMatch(
		/"path": \[\s*"\/collection\/:param1\?\/article",\s*"\/collection\/:param1\?\/article\/__data\.json"\s*\]/
	);
});

test('functions have human friendly display names', () => {
	const functions = read_functions('edge', (content) =>
		content.includes('"name": "SvelteKit /collection/[[optional]]/article"')
	);
	expect(functions[0]).toContain('"name": "SvelteKit /collection/[[optional]]/article"');

	const catch_all = read_functions('node', (content) =>
		content.includes('"name": "SvelteKit catch-all"')
	);
	expect(catch_all.length).toBe(1);
	expect(catch_all[0]).toContain('"name": "SvelteKit catch-all"');
});

test('routes that sanitize to the same pattern generate separate functions', () => {
	const foo_dot = read_functions('node', (content) =>
		content.includes('"name": "SvelteKit /collision/foo.bar"')
	);
	const foo_bar = read_functions('node', (content) =>
		content.includes('"name": "SvelteKit /collision/foo_bar"')
	);

	expect(foo_dot.length).toBe(1);
	expect(foo_bar.length).toBe(1);
	expect(foo_dot[0]).toContain('"name": "SvelteKit /collision/foo.bar"');
	expect(foo_bar[0]).toContain('"name": "SvelteKit /collision/foo_bar"');
});

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { test, expect } from 'vitest';

test('_redirects are copied to publish directory', () => {
	const redirects = fs.readFileSync(
		path.resolve(import.meta.dirname, './build/_redirects'),
		'utf-8'
	);
	expect(redirects).toContain('/redirect-me /greeting/redirected 301');
});

const adapter_is_edge = process.env.EDGE === 'true';
const serverless_dir = path.resolve(import.meta.dirname, './.netlify/v1/functions');
const edge_dir = path.resolve(import.meta.dirname, './.netlify/v1/edge-functions');
const config_path = path.resolve(import.meta.dirname, './.netlify/v1/config.json');

test('omitted runtime inherits the adapter runtime', () => {
	const config = JSON.parse(fs.readFileSync(config_path, 'utf-8'));
	expect(config).not.toHaveProperty('nodeVersion');
	expect(fs.existsSync(serverless_dir)).toBe(true);
	expect(fs.existsSync(edge_dir)).toBe(true);

	const catch_all = read_functions((content) => content.includes('"name": "SvelteKit catch-all"'));
	expect(catch_all).toHaveLength(1);
	expect(catch_all[0].runtime).toBe(adapter_is_edge ? 'edge' : 'nodejs');
	expect(catch_all[0].content).not.toContain('"nodeVersion"');
});

/** @param {(content: string) => boolean} filter */
function read_functions(filter) {
	return [
		...read_directory(serverless_dir, 'nodejs', '.mjs'),
		...read_directory(edge_dir, 'edge', '.js')
	].filter(({ content }) => filter(content));
}

/** @param {string} directory @param {'edge' | 'nodejs'} runtime @param {string} extension */
function read_directory(directory, runtime, extension) {
	if (!fs.existsSync(directory)) return [];
	return fs
		.readdirSync(directory)
		.filter((file) => file.startsWith('sveltekit-') && file.endsWith(extension))
		.map((file) => ({
			file,
			runtime,
			content: fs.readFileSync(path.join(directory, file), 'utf-8')
		}));
}

test('split generates multiple function files', () => {
	const functions = read_functions((content) =>
		content.includes('"name": "SvelteKit /collection/[[optional]]/article"')
	);
	expect(functions.length).toBe(1);
	expect(functions[0].runtime).toBe('edge');
	expect(functions[0].content).toMatch(
		/"path": \[\s*"\/collection\/:param1\?\/article",\s*"\/collection\/:param1\?\/article\/__data\.json"\s*\]/
	);
});

test('functions have human friendly display names', () => {
	const functions = read_functions((content) =>
		content.includes('"name": "SvelteKit /collection/[[optional]]/article"')
	);
	expect(functions[0].content).toContain('"name": "SvelteKit /collection/[[optional]]/article"');

	const catch_all = read_functions((content) => content.includes('"name": "SvelteKit catch-all"'));
	expect(catch_all.length).toBe(1);
	expect(catch_all[0].content).toContain('"name": "SvelteKit catch-all"');
});

test('routes that sanitize to the same pattern generate separate functions', () => {
	const foo_dot = read_functions((content) =>
		content.includes('"name": "SvelteKit /collision/foo.bar"')
	);
	const foo_bar = read_functions((content) =>
		content.includes('"name": "SvelteKit /collision/foo_bar"')
	);

	expect(foo_dot.length).toBe(1);
	expect(foo_bar.length).toBe(1);
	expect(foo_dot[0].content).toContain('"name": "SvelteKit /collision/foo.bar"');
	expect(foo_bar[0].content).toContain('"name": "SvelteKit /collision/foo_bar"');
	expect(foo_dot[0].content).toContain('"nodeVersion": "22"');
	expect(foo_bar[0].content).toContain('"nodeVersion": "24"');
});

test('route runtimes override the adapter runtime and retain exact Node versions', () => {
	const greeting = read_functions((content) =>
		content.includes('"name": "SvelteKit /greeting/[name]"')
	);
	const reroute = read_functions((content) => content.includes('"name": "SvelteKit /reroute"'));

	expect(greeting).toHaveLength(1);
	expect(reroute).toHaveLength(1);
	expect(greeting[0].runtime).toBe('nodejs');
	expect(greeting[0].content).toContain('"nodeVersion": "24"');
	expect(reroute[0].runtime).toBe(adapter_is_edge ? 'nodejs' : 'edge');
	if (adapter_is_edge) expect(reroute[0].content).toContain('"nodeVersion": "24"');
	else expect(reroute[0].content).not.toContain('"nodeVersion"');
});

test('reroute transport works across runtimes', () => {
	const reroute = read_functions((content) => content.includes('"name": "SvelteKit /reroute"'))[0];
	const catch_all = read_functions((content) =>
		content.includes('"name": "SvelteKit catch-all"')
	)[0];
	const parameter = reroute.content.match(/__sveltekit_original_pathname_[\w-]+/)?.[0];

	expect(parameter).toBeTruthy();
	expect(catch_all.content).toContain(parameter);
	expect(reroute.content).not.toContain('x-sveltekit-original-pathname');
});

test('catch-all excludes app routes and route configs include data paths', () => {
	const catch_all = read_functions((content) =>
		content.includes('"name": "SvelteKit catch-all"')
	)[0];
	expect(catch_all.content).toContain('"/greeting/:param1"');
	expect(catch_all.content).toContain('"/greeting/:param1/__data.json"');
});

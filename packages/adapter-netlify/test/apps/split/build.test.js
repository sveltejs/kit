import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, test } from 'vitest';
import { build, deploy } from '../../../../../test-utils/deploy.vitest.js';

const app = deploy(import.meta.dirname);

describe.each([{ edge: false }, { edge: true }])('edge: $edge', ({ edge }) => {
	// the serverless build from `deploy` is rebuilt as edge functions in place
	if (edge) beforeAll(() => build(app, { EDGE: 'true' }), 60_000);

	const functions_dir = path.join(
		app,
		edge ? '.netlify/v1/edge-functions' : '.netlify/v1/functions'
	);

	/** @param {(content: string) => boolean} filter */
	function read_functions(filter) {
		return fs
			.readdirSync(functions_dir)
			.filter((f) => f.startsWith('sveltekit-') && f.endsWith(edge ? '.js' : '.mjs'))
			.map((f) => fs.readFileSync(path.join(functions_dir, f), 'utf-8'))
			.filter(filter);
	}

	test('split functions exclude higher priority paths independently of function name order', () => {
		const functions = fs
			.readdirSync(functions_dir)
			.filter((f) => /^sveltekit-\d+\.(mjs|js)$/.test(f))
			.sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]))
			.map((f) => {
				const content = fs.readFileSync(path.join(functions_dir, f), 'utf-8');
				return JSON.parse(content.match(/(?:export const|const|var) config = (\{[\s\S]*?\});/)[1]);
			});

		/** @param {string} pattern */
		const index = (pattern) => functions.findIndex((config) => config.path.includes(pattern));
		const specific = index('/z/specific');
		const rest = index('/z/*');

		// the platform test only reproduces the bug while name order disagrees with route priority
		expect(`sveltekit-${rest}` < `sveltekit-${specific}`).toBe(true);

		expect(functions[rest].excludedPath).toEqual(
			expect.arrayContaining([
				'/z/specific',
				'/z/specific/__data.json',
				'/z/:param1',
				'/z/:param1/__data.json'
			])
		);
		// routes under a different static prefix can't overlap
		expect(functions[rest].excludedPath).not.toContain('/dynamic/:param1');

		// Matchers share a URLPattern, so the lower priority route belongs in the same function.
		const dynamic = functions.filter((config) => config.path.includes('/z/:param1'));
		expect(dynamic).toHaveLength(1);
		expect(dynamic[0].name).toBe('SvelteKit /z/[slug=known]');
	});

	test('_redirects are copied to publish directory', () => {
		const redirects = fs.readFileSync(path.join(app, 'build/_redirects'), 'utf-8');
		expect(redirects).toContain('/redirect-me /greeting/redirected 301');
	});

	test('split generates multiple function files', () => {
		const functions = read_functions((content) =>
			content.includes('"name": "SvelteKit /collection/[[optional]]/article"')
		);
		expect(functions.length).toBe(1);
		expect(functions[0]).toMatch(
			/"path": \[\s*"\/collection\/:param1\?\/article",\s*"\/collection\/:param1\?\/article\/__data\.json"\s*\]/
		);
	});

	test('functions have human friendly display names', () => {
		const functions = read_functions((content) =>
			content.includes('"name": "SvelteKit /collection/[[optional]]/article"')
		);
		expect(functions[0]).toContain('"name": "SvelteKit /collection/[[optional]]/article"');

		const catch_all = read_functions((content) =>
			content.includes('"name": "SvelteKit catch-all"')
		);
		expect(catch_all.length).toBe(1);
		expect(catch_all[0]).toContain('"name": "SvelteKit catch-all"');
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
		expect(foo_dot[0]).toContain('"name": "SvelteKit /collision/foo.bar"');
		expect(foo_bar[0]).toContain('"name": "SvelteKit /collision/foo_bar"');
	});
});

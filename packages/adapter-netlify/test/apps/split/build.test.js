import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, test } from 'vitest';
import { URLPattern } from 'urlpattern-polyfill';
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

	test.each([
		{
			id: '/docs/[...rest]',
			paths: ['/docs', '/docs/a', '/docs/a/b'],
			excluded: ['/docs-other', '/other/docs']
		},
		{
			id: '/files/[...path]/edit',
			paths: ['/files/edit', '/files/a/edit', '/files/a/b/edit'],
			excluded: ['/files', '/files/a', '/files/a/other']
		},
		{
			id: '/[...rest]/suffix',
			paths: ['/suffix', '/a/suffix', '/a/b/suffix'],
			excluded: ['/', '/a', '/suffix/other']
		},
		{
			id: '/multi/[...first]/middle/[...second]/end',
			paths: [
				'/multi/middle/end',
				'/multi/a/middle/end',
				'/multi/middle/b/end',
				'/multi/a/b/middle/c/d/end'
			],
			excluded: ['/multi/end', '/multi/middle', '/multi/middle/other']
		},
		{
			id: '/optional/[[lang]]/[...rest]',
			paths: ['/optional', '/optional/en', '/optional/en/a/b'],
			excluded: ['/optional-other', '/other/optional']
		}
	])('rest parameters match zero or more segments: $id', ({ id, paths, excluded }) => {
		const functions = read_functions((content) => content.includes(`"name": "SvelteKit ${id}"`));
		expect(functions).toHaveLength(1);
		const patterns = JSON.parse(functions[0].match(/"path":\s*(\[[^]*?\])/)?.[1] ?? '[]');
		const catch_all = read_functions((content) =>
			content.includes('"name": "SvelteKit catch-all"')
		);
		const exclusions = JSON.parse(catch_all[0].match(/"excludedPath":\s*(\[[^]*?\])/)?.[1] ?? '[]');

		/** @param {string} pathname */
		const matches = (pathname) =>
			patterns.some((pattern) => new URLPattern({ pathname: pattern }).test({ pathname }));
		for (const pathname of paths) {
			expect(matches(pathname), pathname).toBe(true);
			expect(matches(`${pathname}/__data.json`), `${pathname}/__data.json`).toBe(true);
		}
		for (const pathname of excluded) {
			expect(matches(pathname), pathname).toBe(false);
			expect(matches(`${pathname}/__data.json`), `${pathname}/__data.json`).toBe(false);
		}
		expect(exclusions).toEqual(expect.arrayContaining(patterns));
	});

	test('rest functions include shorter fallback routes', () => {
		const functions = read_functions((content) =>
			content.includes('"name": "SvelteKit /fallback/[...rest=nonempty]/suffix"')
		);
		expect(functions).toHaveLength(1);
		const server = functions[0].match(/from '(\.\.\/server-sveltekit-\d+\.js)'/)?.[1];
		const content = edge
			? functions[0]
			: fs.readFileSync(path.join(functions_dir, server), 'utf-8');
		expect(content).toContain('/fallback/[slug]');
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

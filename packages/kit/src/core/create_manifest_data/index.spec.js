import path from 'path';
import { fileURLToPath } from 'url';
import { test } from 'uvu';
import * as assert from 'uvu/assert';
import create_manifest_data from './index.js';

const cwd = fileURLToPath(new URL('./test', import.meta.url));

/**
 * @param {string} dir
 * @param {string[]} [extensions]
 * @returns
 */
const create = (dir, extensions = ['.svelte']) => {
	return create_manifest_data({
		config: {
			extensions,
			kit: {
				// @ts-ignore
				files: {
					assets: path.resolve(cwd, 'static'),
					routes: path.resolve(cwd, dir)
				},
				appDir: '_app'
			}
		},
		cwd,
		output: cwd
	});
};

const layout = 'components/layout.svelte';
const error = 'components/error.svelte';

test('creates routes', () => {
	const { components, routes } = create('samples/basic');

	const index = 'samples/basic/index.svelte';
	const about = 'samples/basic/about.svelte';
	const blog = 'samples/basic/blog/index.svelte';
	const blog_$slug = 'samples/basic/blog/[slug].svelte';

	assert.equal(components, [layout, error, index, about, blog, blog_$slug]);

	assert.equal(routes, [
		{
			type: 'page',
			pattern: /^\/$/,
			params: [],
			parts: [layout, index]
		},

		{
			type: 'page',
			pattern: /^\/about$/,
			params: [],
			parts: [layout, about]
		},

		{
			type: 'endpoint',
			pattern: /^\/blog\.json$/,
			file: 'samples/basic/blog/index.json.js',
			params: []
		},

		{
			type: 'page',
			pattern: /^\/blog\/$/,
			params: [],
			parts: [layout, blog]
		},

		{
			type: 'endpoint',
			pattern: /^\/blog\/([^/]+?)\.json$/,
			file: 'samples/basic/blog/[slug].json.ts',
			params: ['slug']
		},

		{
			type: 'page',
			pattern: /^\/blog\/([^/]+?)$/,
			params: ['slug'],
			parts: [layout, blog_$slug]
		}
	]);
});

test('creates routes with layout', () => {
	const { layout, components, routes } = create('samples/basic-layout');

	const $layout = 'samples/basic-layout/$layout.svelte';
	const index = 'samples/basic-layout/index.svelte';
	const foo_$layout = 'samples/basic-layout/foo/$layout.svelte';
	const foo = 'samples/basic-layout/foo/index.svelte';

	assert.equal(layout, $layout);
	assert.equal(components, [layout, error, index, foo_$layout, foo]);

	assert.equal(routes, [
		{
			type: 'page',
			pattern: /^\/$/,
			params: [],
			parts: [layout, index]
		},

		{
			type: 'page',
			pattern: /^\/foo\/$/,
			params: [],
			parts: [layout, foo_$layout, foo]
		}
	]);
});

test('encodes invalid characters', () => {
	const { components, routes } = create('samples/encoding');

	// had to remove ? and " because windows

	// const quote = 'samples/encoding/".svelte';
	const hash = 'samples/encoding/#.svelte';
	// const question_mark = 'samples/encoding/?.svelte';

	assert.equal(components, [
		layout,
		error,
		// quote,
		hash
		// question_mark
	]);

	assert.equal(
		routes.map((p) => p.pattern),
		[
			// /^\/%22\/?$/,
			/^\/%23$/
			// /^\/%3F\/?$/
		]
	);
});

test('sorts routes correctly', () => {
	const { routes } = create('samples/sorting');

	assert.equal(
		routes.map((p) => (p.type === 'page' ? p.parts : p.file)),
		[
			[layout, 'samples/sorting/index.svelte'],
			[layout, 'samples/sorting/about.svelte'],
			[layout, 'samples/sorting/post/index.svelte'],
			[layout, 'samples/sorting/post/bar.svelte'],
			[layout, 'samples/sorting/post/foo.svelte'],
			'samples/sorting/post/f[zz].ts',
			[layout, 'samples/sorting/post/f[xx].svelte'],
			[layout, 'samples/sorting/post/f[yy].svelte'],
			[layout, 'samples/sorting/post/[id].svelte'],
			'samples/sorting/[endpoint].js',
			[layout, 'samples/sorting/[wildcard].svelte'],
			[layout, 'samples/sorting/[...rest]/deep/[...deep_rest]/xyz.svelte'],
			[layout, 'samples/sorting/[...rest]/deep/[...deep_rest]/index.svelte'],
			[layout, 'samples/sorting/[...rest]/deep/index.svelte'],
			[layout, 'samples/sorting/[...rest]/abc.svelte'],
			[layout, 'samples/sorting/[...rest]/index.svelte']
		]
	);
});

test('disallows rest parameters inside segments', () => {
	assert.throws(
		() => {
			create('samples/invalid-rest');
		},
		/** @param {Error} e */
		(e) => {
			return (
				e.message ===
				'Invalid route samples/invalid-rest/foo-[...rest]-bar.svelte — rest parameter must be a standalone segment'
			);
		}
	);
});

test('ignores files and directories with leading underscores', () => {
	const { routes } = create('samples/hidden-underscore');

	assert.equal(routes.map((r) => r.type === 'endpoint' && r.file).filter(Boolean), [
		'samples/hidden-underscore/e/f/g/h.js'
	]);
});

test('ignores files and directories with leading dots except .well-known', () => {
	const { routes } = create('samples/hidden-dot');

	assert.equal(routes.map((r) => r.type === 'endpoint' && r.file).filter(Boolean), [
		'samples/hidden-dot/.well-known/dnt-policy.txt.js'
	]);
});

test('allows multiple slugs', () => {
	const { routes } = create('samples/multiple-slugs');

	assert.equal(
		routes.filter((route) => route.type === 'endpoint'),
		[
			{
				type: 'endpoint',
				pattern: /^\/([^/]+?)\.([^/]+?)$/,
				file: 'samples/multiple-slugs/[file].[ext].js',
				params: ['file', 'ext']
			}
		]
	);
});

test('fails if dynamic params are not separated', () => {
	assert.throws(() => {
		create('samples/invalid-params');
	}, /Invalid route samples\/invalid-params\/\[foo\]\[bar\]\.js — parameters must be separated/);
});

test('ignores things that look like lockfiles', () => {
	const { routes } = create('samples/lockfiles');

	assert.equal(routes, [
		{
			type: 'endpoint',
			file: 'samples/lockfiles/foo.js',
			params: [],
			pattern: /^\/foo\/$/
		}
	]);
});

test('works with custom extensions', () => {
	const { components, routes } = create('samples/custom-extension', [
		'.jazz',
		'.beebop',
		'.funk',
		'.svelte'
	]);

	const index = 'samples/custom-extension/index.funk';
	const about = 'samples/custom-extension/about.jazz';
	const blog = 'samples/custom-extension/blog/index.svelte';
	const blog_$slug = 'samples/custom-extension/blog/[slug].beebop';

	assert.equal(components, [layout, error, index, about, blog, blog_$slug]);

	assert.equal(routes, [
		{
			type: 'page',
			pattern: /^\/$/,
			params: [],
			parts: [layout, index]
		},

		{
			type: 'page',
			pattern: /^\/about$/,
			params: [],
			parts: [layout, about]
		},

		{
			type: 'endpoint',
			pattern: /^\/blog\.json$/,
			file: 'samples/custom-extension/blog/index.json.js',
			params: []
		},

		{
			type: 'page',
			pattern: /^\/blog\/$/,
			params: [],
			parts: [layout, blog]
		},

		{
			type: 'endpoint',
			pattern: /^\/blog\/([^/]+?)\.json$/,
			file: 'samples/custom-extension/blog/[slug].json.js',
			params: ['slug']
		},

		{
			type: 'page',
			pattern: /^\/blog\/([^/]+?)$/,
			params: ['slug'],
			parts: [layout, blog_$slug]
		}
	]);
});

test('lists static assets', () => {
	const { assets } = create('samples/basic');

	assert.equal(assets, [
		{
			file: 'bar/baz.txt',
			size: 14,
			type: 'text/plain'
		},
		{
			file: 'foo.txt',
			size: 9,
			type: 'text/plain'
		}
	]);
});

test.run();

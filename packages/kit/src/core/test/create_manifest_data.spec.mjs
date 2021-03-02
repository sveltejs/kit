import * as path from 'path';
import { fileURLToPath } from 'url';
import { test } from 'uvu';
import * as assert from 'uvu/assert';
import create_manifest_data from '../create_manifest_data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.join(__filename, '..');

const create = (dir, extensions) =>
	create_manifest_data({
		config: {
			files: {
				assets: 'static',
				routes: dir
			},
			appDir: '_app'
		},
		cwd: __dirname,
		extensions
	});

test('creates routes', () => {
	const { components, pages, endpoints } = create('samples/basic');

	const index = 'samples/basic/index.svelte';
	const about = 'samples/basic/about.svelte';
	const blog = 'samples/basic/blog/index.svelte';
	const blog_$slug = 'samples/basic/blog/[slug].svelte';

	assert.equal(components, [index, about, blog, blog_$slug]);

	assert.equal(pages, [
		{
			pattern: /^\/$/,
			params: [],
			parts: [index]
		},

		{
			pattern: /^\/about\/?$/,
			params: [],
			parts: [about]
		},

		{
			pattern: /^\/blog\/?$/,
			params: [],
			parts: [blog]
		},

		{
			pattern: /^\/blog\/([^/]+?)\/?$/,
			params: ['slug'],
			parts: [blog_$slug]
		}
	]);

	assert.equal(endpoints, [
		{
			pattern: /^\/blog\.json$/,
			file: 'samples/basic/blog/index.json.js',
			params: []
		},

		{
			pattern: /^\/blog\/([^/]+?)\.json$/,
			file: 'samples/basic/blog/[slug].json.ts',
			params: ['slug']
		}
	]);
});

test('creates routes with layout', () => {
	const { layout, components, pages } = create('samples/basic-layout');

	const $layout = 'samples/basic-layout/$layout.svelte';
	const index = 'samples/basic-layout/index.svelte';
	const foo_$layout = 'samples/basic-layout/foo/$layout.svelte';
	const foo = 'samples/basic-layout/foo/index.svelte';

	assert.equal(layout, $layout);
	assert.equal(components, [index, foo_$layout, foo]);

	assert.equal(pages, [
		{
			pattern: /^\/$/,
			params: [],
			parts: [index]
		},

		{
			pattern: /^\/foo\/?$/,
			params: [],
			parts: [foo_$layout, foo]
		}
	]);
});

test('encodes invalid characters', () => {
	const { components, pages } = create('samples/encoding');

	// had to remove ? and " because windows

	// const quote = 'samples/encoding/".svelte';
	const hash = 'samples/encoding/#.svelte';
	// const question_mark = 'samples/encoding/?.svelte';

	assert.equal(components, [
		// quote,
		hash
		// question_mark
	]);

	assert.equal(
		pages.map((p) => p.pattern),
		[
			// /^\/%22\/?$/,
			/^\/%23\/?$/
			// /^\/%3F\/?$/
		]
	);
});

test('allows regex qualifiers', () => {
	const { pages } = create('samples/qualifiers');

	assert.equal(
		pages.map((p) => p.pattern),
		[/^\/([0-9-a-z]{3,})\/?$/, /^\/([a-z]{2})\/?$/, /^\/([^/]+?)\/?$/]
	);
});

test('sorts routes correctly', () => {
	const { pages } = create('samples/sorting');

	assert.equal(
		pages.map((p) => p.parts),
		[
			['samples/sorting/index.svelte'],
			['samples/sorting/about.svelte'],
			['samples/sorting/post/index.svelte'],
			['samples/sorting/post/bar.svelte'],
			['samples/sorting/post/foo.svelte'],
			['samples/sorting/post/f[xx].svelte'],
			['samples/sorting/post/[id([0-9-a-z]{3,})].svelte'],
			['samples/sorting/post/[id].svelte'],
			['samples/sorting/[wildcard].svelte'],
			['samples/sorting/[...spread]/deep/[...deep_spread]/xyz.svelte'],
			['samples/sorting/[...spread]/deep/[...deep_spread]/index.svelte'],
			['samples/sorting/[...spread]/deep/index.svelte'],
			['samples/sorting/[...spread]/abc.svelte'],
			['samples/sorting/[...spread]/index.svelte']
		]
	);
});

test('ignores files and directories with leading underscores', () => {
	const { endpoints } = create('samples/hidden-underscore');

	assert.equal(
		endpoints.map((r) => r.file),
		['samples/hidden-underscore/e/f/g/h.js']
	);
});

test('ignores files and directories with leading dots except .well-known', () => {
	const { endpoints } = create('samples/hidden-dot');

	assert.equal(
		endpoints.map((r) => r.file),
		['samples/hidden-dot/.well-known/dnt-policy.txt.js']
	);
});

test('allows multiple slugs', () => {
	const { endpoints } = create('samples/multiple-slugs');

	assert.equal(endpoints, [
		{
			pattern: /^\/([^/]+?)\.([^/]+?)$/,
			file: 'samples/multiple-slugs/[file].[ext].js',
			params: ['file', 'ext']
		}
	]);
});

test('allows multiple slugs with nested square brackets', () => {
	const { endpoints } = create('samples/nested-square-brackets');

	assert.equal(endpoints, [
		{
			pattern: /^\/([a-z]+)\.([a-z]+)$/,
			file: 'samples/nested-square-brackets/[file([a-z]+)].[ext([a-z]+)].js',
			params: ['file', 'ext']
		}
	]);
});

test('fails on clashes', () => {
	assert.throws(() => {
		create('samples/clash-pages');
	}, /The samples\/clash-pages\/\[bar\]\/index\.svelte and samples\/clash-pages\/\[foo\]\.svelte routes clash/);

	assert.throws(() => {
		create('samples/clash-routes');
	}, /The samples\/clash-routes\/\[bar\]\/index\.js and samples\/clash-routes\/\[foo\]\.js routes clash/);
});

test('fails if dynamic params are not separated', () => {
	assert.throws(() => {
		create('samples/invalid-params');
	}, /Invalid route samples\/invalid-params\/\[foo\]\[bar\]\.js — parameters must be separated/);
});

test('errors when trying to use reserved characters in route regexp', () => {
	assert.throws(() => {
		create('samples/invalid-qualifier');
	}, /Invalid route samples\/invalid-qualifier\/\[foo\(\[a-z\]\(\[0-9\]\)\)\].js — cannot use \(, \), \? or : in route qualifiers/);
});

test('ignores things that look like lockfiles', () => {
	const { endpoints } = create('samples/lockfiles');

	assert.equal(endpoints, [
		{
			file: 'samples/lockfiles/foo.js',
			params: [],
			pattern: /^\/foo\/?$/
		}
	]);
});

test('works with custom extensions', () => {
	const { components, pages, endpoints } = create(
		'samples/custom-extension',
		'.jazz .beebop .funk .svelte'
	);

	const index = 'samples/custom-extension/index.funk';
	const about = 'samples/custom-extension/about.jazz';
	const blog = 'samples/custom-extension/blog/index.svelte';
	const blog_$slug = 'samples/custom-extension/blog/[slug].beebop';

	assert.equal(components, [index, about, blog, blog_$slug]);

	assert.equal(pages, [
		{
			pattern: /^\/$/,
			params: [],
			parts: [index]
		},

		{
			pattern: /^\/about\/?$/,
			params: [],
			parts: [about]
		},

		{
			pattern: /^\/blog\/?$/,
			params: [],
			parts: [blog]
		},

		{
			pattern: /^\/blog\/([^/]+?)\/?$/,
			params: ['slug'],
			parts: [blog_$slug]
		}
	]);

	assert.equal(endpoints, [
		{
			pattern: /^\/blog\.json$/,
			file: 'samples/custom-extension/blog/index.json.js',
			params: []
		},
		{
			pattern: /^\/blog\/([^/]+?)\.json$/,
			file: 'samples/custom-extension/blog/[slug].json.js',
			params: ['slug']
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

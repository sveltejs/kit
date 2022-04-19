import path from 'path';
import { fileURLToPath } from 'url';
import { test } from 'uvu';
import * as assert from 'uvu/assert';
import create_manifest_data from './index.js';
import options from '../../config/options.js';

const cwd = fileURLToPath(new URL('./test', import.meta.url));

/**
 * @param {string} dir
 * @param {import('types').Config} config
 */
const create = (dir, config = {}) => {
	const initial = options(config, 'config');

	initial.kit.files.assets = path.resolve(cwd, 'static');
	initial.kit.files.params = path.resolve(cwd, 'params');
	initial.kit.files.routes = path.resolve(cwd, dir);

	return create_manifest_data({
		config: /** @type {import('types').ValidatedConfig} */ (initial),
		fallback: cwd,
		cwd
	});
};

const default_layout = 'layout.svelte';
const default_error = 'error.svelte';

test('creates routes', () => {
	const { components, routes } = create('samples/basic');

	const index = 'samples/basic/index.svelte';
	const about = 'samples/basic/about.svelte';
	const blog = 'samples/basic/blog/index.svelte';
	const blog_$slug = 'samples/basic/blog/[slug].svelte';

	assert.equal(components, [default_layout, default_error, about, blog_$slug, blog, index]);

	assert.equal(routes, [
		{
			type: 'page',
			id: '',
			pattern: /^\/$/,
			path: '/',
			shadow: null,
			a: [default_layout, index],
			b: [default_error]
		},

		{
			type: 'endpoint',
			id: 'blog.json',
			pattern: /^\/blog\.json$/,
			file: 'samples/basic/blog/index.json.js'
		},

		{
			type: 'page',
			id: 'about',
			pattern: /^\/about\/?$/,
			path: '/about',
			shadow: null,
			a: [default_layout, about],
			b: [default_error]
		},

		{
			type: 'page',
			id: 'blog',
			pattern: /^\/blog\/?$/,
			path: '/blog',
			shadow: null,
			a: [default_layout, blog],
			b: [default_error]
		},

		{
			type: 'endpoint',
			id: 'blog/[slug].json',
			pattern: /^\/blog\/([^/]+?)\.json$/,
			file: 'samples/basic/blog/[slug].json.ts'
		},

		{
			type: 'page',
			id: 'blog/[slug]',
			pattern: /^\/blog\/([^/]+?)\/?$/,
			path: '',
			shadow: null,
			a: [default_layout, blog_$slug],
			b: [default_error]
		}
	]);
});

test('creates routes with layout', () => {
	const { components, routes } = create('samples/basic-layout');

	const layout = 'samples/basic-layout/__layout.svelte';
	const index = 'samples/basic-layout/index.svelte';
	const foo___layout = 'samples/basic-layout/foo/__layout.svelte';
	const foo = 'samples/basic-layout/foo/index.svelte';

	assert.equal(components, [layout, default_error, foo___layout, foo, index]);

	assert.equal(routes, [
		{
			type: 'page',
			id: '',
			pattern: /^\/$/,
			path: '/',
			shadow: null,
			a: [layout, index],
			b: [default_error]
		},

		{
			type: 'page',
			id: 'foo',
			pattern: /^\/foo\/?$/,
			path: '/foo',
			shadow: null,
			a: [layout, foo___layout, foo],
			b: [default_error]
		}
	]);
});

// TODO some characters will need to be URL-encoded in the filename
test('encodes invalid characters', () => {
	const { components, routes } = create('samples/encoding');

	// had to remove ? and " because windows

	// const quote = 'samples/encoding/".svelte';
	const hash = 'samples/encoding/%23.svelte';
	// const question_mark = 'samples/encoding/?.svelte';

	assert.equal(components, [
		default_layout,
		default_error,
		// quote,
		hash
		// question_mark
	]);

	assert.equal(
		routes.map((p) => p.pattern),
		[
			// /^\/%22\/?$/,
			/^\/%23\/?$/
			// /^\/%3F\/?$/
		]
	);
});

test('sorts routes correctly', () => {
	const { routes } = create('samples/sorting');

	assert.equal(
		routes.map((p) => p.id),
		[
			'',
			'about',
			'post',
			'post/bar',
			'post/foo',
			'post/f[yy].json',
			'post/f[zz]',
			'post/f[xx]',
			'post/f[yy]',
			'post/[id]',
			'[endpoint]',
			'[wildcard]',
			'[...rest]/deep/[...deep_rest]/xyz',
			'[...rest]/deep/[...deep_rest]',
			'[...rest]/abc',
			'[...rest]/deep',
			'[...anotherrest]',
			'[...rest]'
		]
	);
});

test('sorts routes with rest correctly', () => {
	const { routes } = create('samples/rest');

	assert.equal(
		routes.map((p) => (p.type === 'page' ? p.a : p.file)),
		[
			[default_layout, 'samples/rest/a/[...rest].svelte'],
			[default_layout, 'samples/rest/b/[...rest].svelte']
		]
	);
});

test('allows rest parameters inside segments', () => {
	const { routes } = create('samples/rest-prefix-suffix');

	assert.equal(routes, [
		{
			type: 'page',
			id: 'prefix-[...rest]',
			pattern: /^\/prefix-(.*?)\/?$/,
			path: '',
			shadow: null,
			a: [default_layout, 'samples/rest-prefix-suffix/prefix-[...rest].svelte'],
			b: [default_error]
		},
		{
			type: 'endpoint',
			id: '[...rest].json',
			pattern: /^\/(.*?)\.json$/,
			file: 'samples/rest-prefix-suffix/[...rest].json.js'
		}
	]);
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

test('ignores files by `kit.excludes` config w/RegExp', () => {
	const { routes } = create('samples/hidden-by-excludes-config', {
		kit: {
			routes: (filepath) =>
				!filepath.endsWith('.test.js') &&
				!filepath.endsWith('.spec.js') &&
				!filepath.endsWith('.md')
		}
	});

	assert.equal(
		routes
			.map((r) => r.type === 'endpoint' && r.file)
			.filter(Boolean)
			.sort(),
		[
			'samples/hidden-by-excludes-config/.a.js',
			'samples/hidden-by-excludes-config/.well-known/dnt-policy.txt.js',
			'samples/hidden-by-excludes-config/_a.js',
			'samples/hidden-by-excludes-config/a.js',
			'samples/hidden-by-excludes-config/subdir/.a.js',
			'samples/hidden-by-excludes-config/subdir/_a.js',
			'samples/hidden-by-excludes-config/subdir/.well-known/dnt-policy.txt.js',
			'samples/hidden-by-excludes-config/subdir/a.js'
		].sort()
	);
});

test('allows multiple slugs', () => {
	const { routes } = create('samples/multiple-slugs');

	assert.equal(
		routes.filter((route) => route.type === 'endpoint'),
		[
			{
				type: 'endpoint',
				id: '[file].[ext]',
				pattern: /^\/([^/]+?)\.([^/]+?)$/,
				file: 'samples/multiple-slugs/[file].[ext].js'
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
			id: 'foo',
			file: 'samples/lockfiles/foo.js',
			pattern: /^\/foo\/?$/
		}
	]);
});

test('works with custom extensions', () => {
	const { components, routes } = create('samples/custom-extension', {
		extensions: ['.jazz', '.beebop', '.funk', '.svelte']
	});

	const index = 'samples/custom-extension/index.funk';
	const about = 'samples/custom-extension/about.jazz';
	const blog = 'samples/custom-extension/blog/index.svelte';
	const blog_$slug = 'samples/custom-extension/blog/[slug].beebop';

	assert.equal(components, [default_layout, default_error, about, blog_$slug, blog, index]);

	assert.equal(routes, [
		{
			type: 'page',
			id: '',
			pattern: /^\/$/,
			path: '/',
			shadow: null,
			a: [default_layout, index],
			b: [default_error]
		},

		{
			type: 'endpoint',
			id: 'blog.json',
			pattern: /^\/blog\.json$/,
			file: 'samples/custom-extension/blog/index.json.js'
		},

		{
			type: 'page',
			id: 'about',
			pattern: /^\/about\/?$/,
			path: '/about',
			shadow: null,
			a: [default_layout, about],
			b: [default_error]
		},

		{
			type: 'page',
			id: 'blog',
			pattern: /^\/blog\/?$/,
			path: '/blog',
			shadow: null,
			a: [default_layout, blog],
			b: [default_error]
		},

		{
			type: 'endpoint',
			id: 'blog/[slug].json',
			pattern: /^\/blog\/([^/]+?)\.json$/,
			file: 'samples/custom-extension/blog/[slug].json.js'
		},

		{
			type: 'page',
			id: 'blog/[slug]',
			pattern: /^\/blog\/([^/]+?)\/?$/,
			path: '',
			shadow: null,
			a: [default_layout, blog_$slug],
			b: [default_error]
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

test('includes nested error components', () => {
	const { routes } = create('samples/nested-errors');

	assert.equal(routes, [
		{
			type: 'page',
			id: 'foo/bar/baz',
			pattern: /^\/foo\/bar\/baz\/?$/,
			path: '/foo/bar/baz',
			shadow: null,
			a: [
				default_layout,
				'samples/nested-errors/foo/__layout.svelte',
				undefined,
				'samples/nested-errors/foo/bar/baz/__layout.svelte',
				'samples/nested-errors/foo/bar/baz/index.svelte'
			],
			b: [
				default_error,
				undefined,
				'samples/nested-errors/foo/bar/__error.svelte',
				'samples/nested-errors/foo/bar/baz/__error.svelte'
			]
		}
	]);
});

test('errors on encountering an illegal __file', () => {
	assert.throws(
		() => create('samples/illegal-dunder'),
		/Files and directories prefixed with __ are reserved \(saw samples\/illegal-dunder\/__foo.svelte\)/
	);
});

test('creates routes with named layouts', () => {
	const { components, routes } = create('samples/named-layouts');

	assert.equal(components, [
		'samples/named-layouts/__layout.svelte',
		default_error,
		'samples/named-layouts/__layout-home@default.svelte',
		'samples/named-layouts/__layout-special.svelte',
		'samples/named-layouts/a/__layout.svelte',
		'samples/named-layouts/b/__layout-alsospecial@special.svelte',
		'samples/named-layouts/b/c/__layout.svelte',
		'samples/named-layouts/b/d/__layout-extraspecial@special.svelte',
		'samples/named-layouts/b/d/__layout-special.svelte',
		'samples/named-layouts/a/a1.svelte',
		'samples/named-layouts/a/a2@special.svelte',
		'samples/named-layouts/b/c/c1@alsospecial.svelte',
		'samples/named-layouts/b/c/c2@home.svelte',
		'samples/named-layouts/b/d/d1.svelte',
		'samples/named-layouts/b/d/d2@extraspecial.svelte',
		'samples/named-layouts/b/d/index@special.svelte'
	]);

	assert.equal(routes, [
		{
			type: 'page',
			id: 'a/a1',
			pattern: /^\/a\/a1\/?$/,
			path: '/a/a1',
			shadow: null,
			a: [
				'samples/named-layouts/__layout.svelte',
				'samples/named-layouts/a/__layout.svelte',
				'samples/named-layouts/a/a1.svelte'
			],
			b: [default_error]
		},
		{
			type: 'page',
			id: 'a/a2@special',
			pattern: /^\/a\/a2\/?$/,
			path: '/a/a2',
			shadow: null,
			a: [
				'samples/named-layouts/__layout-special.svelte',
				'samples/named-layouts/a/a2@special.svelte'
			],
			b: [default_error]
		},
		{
			type: 'page',
			id: 'b/d@special',
			pattern: /^\/b\/d\/?$/,
			path: '/b/d',
			shadow: null,
			a: [
				'samples/named-layouts/__layout.svelte',
				'samples/named-layouts/b/d/__layout-special.svelte',
				'samples/named-layouts/b/d/index@special.svelte'
			],
			b: [default_error]
		},
		{
			type: 'page',
			id: 'b/c/c1@alsospecial',
			pattern: /^\/b\/c\/c1\/?$/,
			path: '/b/c/c1',
			shadow: null,
			a: [
				'samples/named-layouts/__layout-special.svelte',
				'samples/named-layouts/b/__layout-alsospecial@special.svelte',
				'samples/named-layouts/b/c/c1@alsospecial.svelte'
			],
			b: [default_error]
		},
		{
			type: 'page',
			id: 'b/c/c2@home',
			pattern: /^\/b\/c\/c2\/?$/,
			path: '/b/c/c2',
			shadow: null,
			a: [
				'samples/named-layouts/__layout.svelte',
				'samples/named-layouts/__layout-home@default.svelte',
				'samples/named-layouts/b/c/c2@home.svelte'
			],
			b: [default_error, default_error]
		},
		{
			type: 'page',
			id: 'b/d/d1',
			pattern: /^\/b\/d\/d1\/?$/,
			path: '/b/d/d1',
			shadow: null,
			a: ['samples/named-layouts/__layout.svelte', 'samples/named-layouts/b/d/d1.svelte'],
			b: [default_error]
		},
		{
			type: 'page',
			id: 'b/d/d2@extraspecial',
			pattern: /^\/b\/d\/d2\/?$/,
			path: '/b/d/d2',
			shadow: null,
			a: [
				'samples/named-layouts/__layout.svelte',
				'samples/named-layouts/b/d/__layout-special.svelte',
				'samples/named-layouts/b/d/__layout-extraspecial@special.svelte',
				'samples/named-layouts/b/d/d2@extraspecial.svelte'
			],
			b: [default_error]
		}
	]);
});

test('errors on missing layout', () => {
	assert.throws(
		() => create('samples/named-layout-missing'),
		/samples\/named-layout-missing\/index@missing.svelte references missing layout "missing"/
	);
});

test('errors on layout named default', () => {
	assert.throws(
		() => create('samples/named-layout-default'),
		/samples\/named-layout-default\/__layout-default.svelte cannot use reserved "default" name/
	);
});

test('errors on duplicate layout definition', () => {
	assert.throws(
		() => create('samples/duplicate-layout'),
		/Duplicate layout samples\/duplicate-layout\/__layout-a@x.svelte already defined at samples\/duplicate-layout\/__layout-a.svelte/
	);
});

test('allows for __tests__ directories', () => {
	const { routes } = create('samples/legal-dunder');

	assert.equal(routes, []);
});

test('creates param matchers', () => {
	const { matchers } = create('samples/basic'); // directory doesn't matter for the test

	assert.equal(matchers, {
		foo: path.join('params', 'foo.js'),
		bar: path.join('params', 'bar.js')
	});
});

test.run();

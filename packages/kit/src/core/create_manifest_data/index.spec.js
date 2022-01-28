import path from 'path';
import { fileURLToPath } from 'url';
import { test } from 'uvu';
import * as assert from 'uvu/assert';
import create_manifest_data from './index.js';
import options from '../config/options.js';

const cwd = fileURLToPath(new URL('./test', import.meta.url));

/**
 * @param {string} dir
 * @param {import('types/config').Config} config
 * @returns
 */
const create = (dir, config = {}) => {
	const initial = options(config, 'config');

	initial.kit.files.assets = path.resolve(cwd, 'static');
	initial.kit.files.routes = path.resolve(cwd, dir);

	return create_manifest_data({
		config: /** @type {import('types/config').ValidatedConfig} */ (initial),
		fallback: cwd,
		cwd
	});
};

const layout = 'layout.svelte';
const error = 'error.svelte';

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
			segments: [],
			pattern: /^\/$/,
			params: [],
			path: '/',
			a: [layout, index],
			b: [error]
		},

		{
			type: 'page',
			segments: [{ rest: false, dynamic: false, content: 'about' }],
			pattern: /^\/about\/?$/,
			params: [],
			path: '/about',
			a: [layout, about],
			b: [error]
		},

		{
			type: 'endpoint',
			segments: [{ rest: false, dynamic: false, content: 'blog.json' }],
			pattern: /^\/blog\.json$/,
			file: 'samples/basic/blog/index.json.js',
			params: []
		},

		{
			type: 'page',
			segments: [{ rest: false, dynamic: false, content: 'blog' }],
			pattern: /^\/blog\/?$/,
			params: [],
			path: '/blog',
			a: [layout, blog],
			b: [error]
		},

		{
			type: 'endpoint',
			segments: [
				{ rest: false, dynamic: false, content: 'blog' },
				{ rest: false, dynamic: true, content: '[slug].json' }
			],
			pattern: /^\/blog\/([^/]+?)\.json$/,
			file: 'samples/basic/blog/[slug].json.ts',
			params: ['slug']
		},

		{
			type: 'page',
			segments: [
				{ rest: false, dynamic: false, content: 'blog' },
				{ rest: false, dynamic: true, content: '[slug]' }
			],
			pattern: /^\/blog\/([^/]+?)\/?$/,
			params: ['slug'],
			path: '',
			a: [layout, blog_$slug],
			b: [error]
		}
	]);
});

test('creates routes with layout', () => {
	const { layout, components, routes } = create('samples/basic-layout');

	const __layout = 'samples/basic-layout/__layout.svelte';
	const index = 'samples/basic-layout/index.svelte';
	const foo___layout = 'samples/basic-layout/foo/__layout.svelte';
	const foo = 'samples/basic-layout/foo/index.svelte';

	assert.equal(layout, __layout);
	assert.equal(components, [layout, error, index, foo___layout, foo]);

	assert.equal(routes, [
		{
			type: 'page',
			segments: [],
			pattern: /^\/$/,
			params: [],
			path: '/',
			a: [layout, index],
			b: [error]
		},

		{
			type: 'page',
			segments: [{ rest: false, dynamic: false, content: 'foo' }],
			pattern: /^\/foo\/?$/,
			params: [],
			path: '/foo',
			a: [layout, foo___layout, foo],
			b: [error]
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
			/^\/%23\/?$/
			// /^\/%3F\/?$/
		]
	);
});

test('sorts routes correctly', () => {
	const { routes } = create('samples/sorting');

	assert.equal(
		routes.map((p) => (p.type === 'page' ? p.a : p.file)),
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
			[layout, 'samples/sorting/[...anotherrest]/index.svelte'],
			[layout, 'samples/sorting/[...rest]/deep/[...deep_rest]/xyz.svelte'],
			[layout, 'samples/sorting/[...rest]/deep/[...deep_rest]/index.svelte'],
			[layout, 'samples/sorting/[...rest]/deep/index.svelte'],
			[layout, 'samples/sorting/[...rest]/abc.svelte'],
			[layout, 'samples/sorting/[...rest]/index.svelte']
		]
	);
});

test('sorts routes with rest correctly', () => {
	const { routes } = create('samples/rest');

	assert.equal(
		routes.map((p) => (p.type === 'page' ? p.a : p.file)),
		[
			'samples/rest/a/[...rest].js',
			[layout, 'samples/rest/a/[...rest].svelte'],
			'samples/rest/b/[...rest].ts',
			[layout, 'samples/rest/b/[...rest].svelte']
		]
	);
});

test('disallows rest parameters inside segments', () => {
	const { routes } = create('samples/rest-prefix-suffix');

	assert.equal(routes, [
		{
			type: 'page',
			segments: [
				{
					dynamic: true,
					rest: true,
					content: 'prefix-[...rest]'
				}
			],
			pattern: /^\/prefix-(.*?)\/?$/,
			params: ['...rest'],
			path: '',
			a: [layout, 'samples/rest-prefix-suffix/prefix-[...rest].svelte'],
			b: [error]
		},
		{
			type: 'endpoint',
			segments: [
				{
					dynamic: true,
					rest: true,
					content: '[...rest].json'
				}
			],
			pattern: /^\/(.*?)\.json$/,
			file: 'samples/rest-prefix-suffix/[...rest].json.js',
			params: ['...rest']
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
			routes: (filepath) => !filepath.endsWith('.test.js') && !filepath.endsWith('.spec.js')
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
			'samples/hidden-by-excludes-config/a.md',
			'samples/hidden-by-excludes-config/subdir/.a.js',
			'samples/hidden-by-excludes-config/subdir/_a.js',
			'samples/hidden-by-excludes-config/subdir/.well-known/dnt-policy.txt.js',
			'samples/hidden-by-excludes-config/subdir/a.js',
			'samples/hidden-by-excludes-config/subdir/a.md'
		].sort()
	);
});

test('ignores files by `kit.excludes` config w/string', () => {
	const { routes } = create('samples/hidden-by-excludes-config', {
		kit: {
			routes: (filepath) => !filepath.split('/').includes('a.js')
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
			'samples/hidden-by-excludes-config/a.md',
			'samples/hidden-by-excludes-config/a.spec.js',
			'samples/hidden-by-excludes-config/subdir/.a.js',
			'samples/hidden-by-excludes-config/subdir/.well-known/dnt-policy.txt.js',
			'samples/hidden-by-excludes-config/subdir/_a.js',
			'samples/hidden-by-excludes-config/subdir/a.md',
			'samples/hidden-by-excludes-config/subdir/a.spec.js'
		].sort()
	);
});

test('ignores files by `kit.excludes` config w/function', () => {
	const { routes } = create('samples/hidden-by-excludes-config', {
		kit: {
			routes: (filepath) => !filepath.startsWith('samples/hidden-by-excludes-config/subdir')
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
			'samples/hidden-by-excludes-config/a.md',
			'samples/hidden-by-excludes-config/a.spec.js'
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
				segments: [{ dynamic: true, rest: false, content: '[file].[ext]' }],
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
			segments: [{ rest: false, dynamic: false, content: 'foo' }],
			file: 'samples/lockfiles/foo.js',
			params: [],
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

	assert.equal(components, [layout, error, index, about, blog, blog_$slug]);

	assert.equal(routes, [
		{
			type: 'page',
			segments: [],
			pattern: /^\/$/,
			params: [],
			path: '/',
			a: [layout, index],
			b: [error]
		},

		{
			type: 'page',
			segments: [{ rest: false, dynamic: false, content: 'about' }],
			pattern: /^\/about\/?$/,
			params: [],
			path: '/about',
			a: [layout, about],
			b: [error]
		},

		{
			type: 'endpoint',
			segments: [{ rest: false, dynamic: false, content: 'blog.json' }],
			pattern: /^\/blog\.json$/,
			file: 'samples/custom-extension/blog/index.json.js',
			params: []
		},

		{
			type: 'page',
			segments: [{ rest: false, dynamic: false, content: 'blog' }],
			pattern: /^\/blog\/?$/,
			params: [],
			path: '/blog',
			a: [layout, blog],
			b: [error]
		},

		{
			type: 'endpoint',
			segments: [
				{ rest: false, dynamic: false, content: 'blog' },
				{ rest: false, dynamic: true, content: '[slug].json' }
			],
			pattern: /^\/blog\/([^/]+?)\.json$/,
			file: 'samples/custom-extension/blog/[slug].json.js',
			params: ['slug']
		},

		{
			type: 'page',
			segments: [
				{ rest: false, dynamic: false, content: 'blog' },
				{ rest: false, dynamic: true, content: '[slug]' }
			],
			pattern: /^\/blog\/([^/]+?)\/?$/,
			params: ['slug'],
			path: '',
			a: [layout, blog_$slug],
			b: [error]
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
			segments: [
				{ rest: false, dynamic: false, content: 'foo' },
				{ rest: false, dynamic: false, content: 'bar' },
				{ rest: false, dynamic: false, content: 'baz' }
			],
			pattern: /^\/foo\/bar\/baz\/?$/,
			params: [],
			path: '/foo/bar/baz',
			a: [
				layout,
				'samples/nested-errors/foo/__layout.svelte',
				undefined,
				'samples/nested-errors/foo/bar/baz/__layout.svelte',
				'samples/nested-errors/foo/bar/baz/index.svelte'
			],
			b: [
				error,
				undefined,
				'samples/nested-errors/foo/bar/__error.svelte',
				'samples/nested-errors/foo/bar/baz/__error.svelte'
			]
		}
	]);
});

test('resets layout', () => {
	const { routes } = create('samples/layout-reset');

	assert.equal(routes, [
		{
			type: 'page',
			segments: [],
			pattern: /^\/$/,
			params: [],
			path: '/',
			a: [layout, 'samples/layout-reset/index.svelte'],
			b: [error]
		},
		{
			type: 'page',
			segments: [{ rest: false, dynamic: false, content: 'foo' }],
			pattern: /^\/foo\/?$/,
			params: [],
			path: '/foo',
			a: [
				layout,
				'samples/layout-reset/foo/__layout.svelte',
				'samples/layout-reset/foo/index.svelte'
			],
			b: [error]
		},
		{
			type: 'page',
			segments: [
				{ rest: false, dynamic: false, content: 'foo' },
				{ rest: false, dynamic: false, content: 'bar' }
			],
			pattern: /^\/foo\/bar\/?$/,
			params: [],
			path: '/foo/bar',
			a: [
				'samples/layout-reset/foo/bar/__layout.reset.svelte',
				'samples/layout-reset/foo/bar/index.svelte'
			],
			b: ['samples/layout-reset/foo/bar/__error.svelte']
		}
	]);
});

test('errors on encountering an illegal __file', () => {
	assert.throws(
		() => create('samples/illegal-dunder'),
		/Files and directories prefixed with __ are reserved \(saw samples\/illegal-dunder\/__foo.svelte\)/
	);
});

test.run();

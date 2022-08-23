import fs from 'fs';
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

const default_layout = {
	component: 'layout.svelte'
};

const default_error = {
	component: 'error.svelte'
};

/** @param {import('types').RouteData} route */
function simplify(route) {
	/** @type {{ id: string, pattern: string, page?: import('types').PageNodeIndexes, endpoint?: { file: string } }} */
	const simplified = {
		id: route.id,
		pattern: route.pattern.toString().replace(/\\\//g, '/').replace(/\\\./g, '.')
	};

	if (route.page) simplified.page = route.page;
	if (route.endpoint) simplified.endpoint = route.endpoint;

	return simplified;
}

test('creates routes', () => {
	const { nodes, routes } = create('samples/basic');

	assert.equal(nodes, [
		default_layout,
		default_error,
		{ component: 'samples/basic/+page.svelte' },
		{ component: 'samples/basic/about/+page.svelte' },
		{ component: 'samples/basic/blog/+page.svelte' },
		{ component: 'samples/basic/blog/[slug]/+page.svelte' }
	]);

	assert.equal(routes.map(simplify), [
		{
			id: '',
			pattern: '/^/$/',
			page: { layouts: [0], errors: [1], leaf: 2 }
		},

		{
			id: 'blog.json',
			pattern: '/^/blog.json$/',
			endpoint: { file: 'samples/basic/blog.json/+server.js' }
		},

		{
			id: 'about',
			pattern: '/^/about/?$/',
			page: { layouts: [0], errors: [1], leaf: 3 }
		},

		{
			id: 'blog',
			pattern: '/^/blog/?$/',
			page: { layouts: [0], errors: [1], leaf: 4 }
		},

		{
			id: 'blog/[slug].json',
			pattern: '/^/blog/([^/]+?).json$/',
			endpoint: {
				file: 'samples/basic/blog/[slug].json/+server.ts'
			}
		},

		{
			id: 'blog/[slug]',
			pattern: '/^/blog/([^/]+?)/?$/',
			page: { layouts: [0], errors: [1], leaf: 5 }
		}
	]);
});

const symlink_survived_git = fs
	.statSync(path.join(cwd, 'samples/symlinks/routes/foo'))
	.isSymbolicLink();

const test_symlinks = symlink_survived_git ? test : test.skip;

test_symlinks('creates symlinked routes', () => {
	const { nodes, routes } = create('samples/symlinks/routes');

	assert.equal(nodes, [
		default_layout,
		default_error,
		{ component: 'samples/symlinks/routes/foo/index.svelte' },
		{ component: 'samples/symlinks/routes/index.svelte' }
	]);

	assert.equal(routes, [
		{
			id: '',
			pattern: '/^/$/',
			page: { layouts: [0], errors: [1], leaf: 1 }
		},

		{
			id: 'foo',
			pattern: '/^/foo/?$/',
			page: { layouts: [0], errors: [1], leaf: 2 }
		}
	]);
});

test('creates routes with layout', () => {
	const { nodes, routes } = create('samples/basic-layout');

	assert.equal(nodes, [
		{ component: 'samples/basic-layout/+layout.svelte' },
		default_error,
		{ component: 'samples/basic-layout/foo/+layout.svelte' },
		{ component: 'samples/basic-layout/+page.svelte' },
		{ component: 'samples/basic-layout/foo/+page.svelte' }
	]);

	assert.equal(routes.map(simplify), [
		{
			id: '',
			pattern: '/^/$/',
			page: { layouts: [0], errors: [1], leaf: 3 }
		},

		{
			id: 'foo',
			pattern: '/^/foo/?$/',
			page: { layouts: [0, 2], errors: [1, undefined], leaf: 4 }
		}
	]);
});

test('succeeds when routes does not exist', () => {
	const { nodes, routes } = create('samples/basic/routes');
	assert.equal(nodes, [default_layout, default_error]);
	assert.equal(routes, []);
});

// TODO some characters will need to be URL-encoded in the filename
test('encodes invalid characters', () => {
	const { nodes, routes } = create('samples/encoding');

	// had to remove ? and " because windows

	// const quote = 'samples/encoding/".svelte';
	const hash = { component: 'samples/encoding/%23/+page.svelte' };
	// const question_mark = 'samples/encoding/?.svelte';

	assert.equal(nodes, [
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

	assert.equal(routes, [
		{
			type: 'page',
			id: 'a/[...rest]',
			pattern: /^\/a(?:\/(.*))?\/?$/,
			errors: [default_error],
			layouts: [default_layout],
			leaf: {
				component: 'samples/rest/a/[...rest]/+page.svelte',
				server: 'samples/rest/a/[...rest]/+page.server.js'
			}
		},
		{
			type: 'page',
			id: 'b/[...rest]',
			pattern: /^\/b(?:\/(.*))?\/?$/,
			errors: [default_error],
			layouts: [default_layout],
			leaf: {
				component: 'samples/rest/b/[...rest]/+page.svelte',
				server: 'samples/rest/b/[...rest]/+page.server.ts'
			}
		}
	]);
});

test('allows rest parameters inside segments', () => {
	const { routes } = create('samples/rest-prefix-suffix');

	assert.equal(routes, [
		{
			type: 'page',
			id: 'prefix-[...rest]',
			pattern: /^\/prefix-(.*?)\/?$/,
			errors: [default_error],
			layouts: [default_layout],
			leaf: {
				component: 'samples/rest-prefix-suffix/prefix-[...rest]/+page.svelte'
			}
		},
		{
			type: 'endpoint',
			id: '[...rest].json',
			pattern: /^\/(.*?)\.json$/,
			file: 'samples/rest-prefix-suffix/[...rest].json/+server.js'
		}
	]);
});

test('ignores files and directories with leading underscores', () => {
	const { routes } = create('samples/hidden-underscore');

	assert.equal(routes.map((r) => r.endpoint?.file).filter(Boolean), [
		'samples/hidden-underscore/e/f/g/h/+server.js'
	]);
});

test('ignores files and directories with leading dots except .well-known', () => {
	const { routes } = create('samples/hidden-dot');

	assert.equal(routes.map((r) => r.endpoint?.file).filter(Boolean), [
		'samples/hidden-dot/.well-known/dnt-policy.txt/+server.js'
	]);
});

test('allows multiple slugs', () => {
	const { routes } = create('samples/multiple-slugs');

	assert.equal(
		routes.filter((route) => route.endpoint),
		[
			{
				type: 'endpoint',
				id: '[file].[ext]',
				pattern: /^\/([^/]+?)\.([^/]+?)$/,
				file: 'samples/multiple-slugs/[file].[ext]/+server.js'
			}
		]
	);
});

test('fails if dynamic params are not separated', () => {
	assert.throws(() => {
		create('samples/invalid-params');
	}, /Invalid route samples\/invalid-params\/\[foo\]\[bar\]\/\+server\.js — parameters must be separated/);
});

test('ignores things that look like lockfiles', () => {
	const { routes } = create('samples/lockfiles');

	assert.equal(routes, [
		{
			type: 'endpoint',
			id: 'foo',
			file: 'samples/lockfiles/foo/+server.js',
			pattern: /^\/foo\/?$/
		}
	]);
});

test('works with custom extensions', () => {
	const { nodes, routes } = create('samples/custom-extension', {
		extensions: ['.jazz', '.beebop', '.funk', '.svelte']
	});

	const index = { component: 'samples/custom-extension/+page.funk' };
	const about = { component: 'samples/custom-extension/about/+page.jazz' };
	const blog = { component: 'samples/custom-extension/blog/+page.svelte' };
	const blog_$slug = { component: 'samples/custom-extension/blog/[slug]/+page.beebop' };

	assert.equal(nodes, [default_layout, default_error, index, about, blog, blog_$slug]);

	assert.equal(routes, [
		{
			type: 'page',
			id: '',
			pattern: /^\/$/,
			errors: [default_error],
			layouts: [default_layout],
			leaf: index
		},

		{
			type: 'endpoint',
			id: 'blog.json',
			pattern: /^\/blog\.json$/,
			file: 'samples/custom-extension/blog.json/+server.js'
		},

		{
			type: 'page',
			id: 'about',
			pattern: /^\/about\/?$/,
			errors: [default_error],
			layouts: [default_layout],
			leaf: about
		},

		{
			type: 'page',
			id: 'blog',
			pattern: /^\/blog\/?$/,
			errors: [default_error],
			layouts: [default_layout],
			leaf: blog
		},

		{
			type: 'endpoint',
			id: 'blog/[slug].json',
			pattern: /^\/blog\/([^/]+?)\.json$/,
			file: 'samples/custom-extension/blog/[slug].json/+server.js'
		},

		{
			type: 'page',
			id: 'blog/[slug]',
			pattern: /^\/blog\/([^/]+?)\/?$/,
			errors: [default_error],
			layouts: [default_layout],
			leaf: blog_$slug
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
			errors: [
				default_error,
				undefined,
				{ component: 'samples/nested-errors/foo/bar/+error.svelte' },
				{ component: 'samples/nested-errors/foo/bar/baz/+error.svelte' }
			],
			layouts: [
				default_layout,
				{ component: 'samples/nested-errors/foo/+layout.svelte' },
				undefined,
				{ component: 'samples/nested-errors/foo/bar/baz/+layout.svelte' }
			],
			leaf: {
				component: 'samples/nested-errors/foo/bar/baz/+page.svelte'
			}
		}
	]);
});

test('creates routes with named layouts', () => {
	const { nodes, routes } = create('samples/named-layouts');

	const root_layout = { component: 'samples/named-layouts/+layout.svelte' };
	const special_layout = {
		component: 'samples/named-layouts/(special)/+layout.svelte',
		shared: 'samples/named-layouts/(special)/+layout.js',
		server: 'samples/named-layouts/(special)/+layout.server.js'
	};

	assert.equal(nodes, [
		// layouts
		root_layout,
		default_error,
		special_layout,
		{ component: 'samples/named-layouts/(special)/(alsospecial)/+layout.svelte' },
		{ component: 'samples/named-layouts/a/+layout.svelte' },
		{ component: 'samples/named-layouts/b/c/+layout.svelte' },
		{ component: 'samples/named-layouts/b/d/(special)/+layout.svelte' },
		{ component: 'samples/named-layouts/b/d/(special)/(extraspecial)/+layout.svelte' },

		// pages
		{ component: 'samples/named-layouts/(special)/(alsospecial)/b/c/c1/+page.svelte' },
		{ component: 'samples/named-layouts/(special)/a/a2/+page.svelte' },
		{ component: 'samples/named-layouts/a/a1/+page.svelte' },
		{ component: 'samples/named-layouts/b/c/c2/+page@.svelte' },
		{ component: 'samples/named-layouts/b/d/(special)/(extraspecial)/d2/+page.svelte' },
		{ component: 'samples/named-layouts/b/d/(special)/+page.svelte' },
		{ component: 'samples/named-layouts/b/d/d1/+page.svelte' }
	]);

	assert.equal(routes, [
		{
			type: 'page',
			id: 'a/a1',
			pattern: /^\/a\/a1\/?$/,
			errors: [default_error],
			layouts: [root_layout, { component: 'samples/named-layouts/a/+layout.svelte' }],
			leaf: { component: 'samples/named-layouts/a/a1/+page.svelte' }
		},
		{
			type: 'page',
			id: '(special)/a/a2',
			pattern: /^\/a\/a2\/?$/,
			errors: [default_error],
			layouts: [root_layout, special_layout],
			leaf: { component: 'samples/named-layouts/(special)/a/a2/+page.svelte' }
		},
		{
			type: 'page',
			id: 'b/c/c2',
			pattern: /^\/b\/c\/c2\/?$/,
			errors: [default_error],
			layouts: [root_layout, { component: 'samples/named-layouts/b/c/+layout.svelte' }],
			leaf: { component: 'samples/named-layouts/b/c/c2/+page@.svelte' }
		},
		{
			type: 'page',
			id: 'b/d/(special)',
			pattern: /^\/b\/d\/?$/,
			errors: [default_error],
			layouts: [root_layout, { component: 'samples/named-layouts/b/d/(special)/+layout.svelte' }],
			leaf: { component: 'samples/named-layouts/b/d/(special)/+page.svelte' }
		},
		{
			type: 'page',
			id: 'b/d/d1',
			pattern: /^\/b\/d\/d1\/?$/,
			errors: [default_error],
			layouts: [root_layout],
			leaf: { component: 'samples/named-layouts/b/d/d1/+page.svelte' }
		},
		{
			type: 'page',
			id: '(special)/(alsospecial)/b/c/c1',
			pattern: /^\/b\/c\/c1\/?$/,
			errors: [default_error],
			layouts: [
				root_layout,
				special_layout,
				{ component: 'samples/named-layouts/(special)/(alsospecial)/+layout.svelte' }
			],
			leaf: {
				component: 'samples/named-layouts/(special)/(alsospecial)/b/c/c1/+page.svelte'
			}
		},
		{
			type: 'page',
			id: 'b/d/(special)/(extraspecial)/d2',
			pattern: /^\/b\/d\/d2\/?$/,
			errors: [default_error],
			layouts: [
				root_layout,
				{ component: 'samples/named-layouts/b/d/(special)/+layout.svelte' },
				{ component: 'samples/named-layouts/b/d/(special)/(extraspecial)/+layout.svelte' }
			],
			leaf: { component: 'samples/named-layouts/b/d/(special)/(extraspecial)/d2/+page.svelte' }
		}
	]);
});

test('handles pages without .svelte file', () => {
	const { routes } = create('samples/page-without-svelte-file');

	assert.equal(routes, [
		{
			type: 'page',
			id: '',
			pattern: /^\/$/,
			errors: [
				{
					component: 'error.svelte'
				}
			],
			layouts: [
				{
					component: 'layout.svelte'
				}
			],
			leaf: {
				component: 'samples/page-without-svelte-file/+page.svelte'
			}
		},
		{
			type: 'page',
			id: 'layout/exists',
			pattern: /^\/layout\/exists\/?$/,
			errors: [
				{
					component: 'error.svelte'
				}
			],
			layouts: [
				{
					component: 'layout.svelte'
				},
				{
					component: 'samples/page-without-svelte-file/layout/+layout.svelte'
				}
			],
			leaf: {
				component: 'samples/page-without-svelte-file/layout/exists/+page.svelte'
			}
		},
		{
			type: 'page',
			id: 'layout/redirect',
			pattern: /^\/layout\/redirect\/?$/,
			errors: [
				{
					component: 'error.svelte'
				}
			],
			layouts: [
				{
					component: 'layout.svelte'
				},
				{
					component: 'samples/page-without-svelte-file/layout/+layout.svelte'
				}
			],
			leaf: {
				server: 'samples/page-without-svelte-file/layout/redirect/+page.server.js'
			}
		},
		{
			type: 'page',
			id: 'error/[...path]',
			pattern: /^\/error(?:\/(.*))?\/?$/,
			errors: [
				{
					component: 'error.svelte'
				},
				{
					component: 'samples/page-without-svelte-file/error/+error.svelte'
				}
			],
			layouts: [
				{
					component: 'layout.svelte'
				},
				undefined
			],
			leaf: {
				shared: 'samples/page-without-svelte-file/error/[...path]/+page.js'
			}
		}
	]);
});

test('errors on missing layout', () => {
	assert.throws(
		() => create('samples/named-layout-missing'),
		/samples\/named-layout-missing\/\+page@missing.svelte references missing segment "missing"/
	);
});

test('errors on invalid named layout reference', () => {
	assert.throws(
		() => create('samples/invalid-named-layout-reference'),
		/Only Svelte files can reference named layouts. Remove '@' from \+page@.js \(at samples\/invalid-named-layout-reference\/x\/\+page@.js\)/
	);
});

test('creates param matchers', () => {
	const { matchers } = create('samples/basic'); // directory doesn't matter for the test

	assert.equal(matchers, {
		foo: path.join('params', 'foo.js'),
		bar: path.join('params', 'bar.js')
	});
});

test('errors on param matchers with bad names', () => {
	const boogaloo = path.resolve(cwd, 'params', 'boo-galoo.js');
	fs.writeFileSync(boogaloo, '');
	try {
		assert.throws(() => create('samples/basic'), /Matcher names can only have/);
	} finally {
		fs.unlinkSync(boogaloo);
	}
});

test('errors on duplicate matchers', () => {
	const ts_foo = path.resolve(cwd, 'params', 'foo.ts');
	fs.writeFileSync(ts_foo, '');
	try {
		assert.throws(() => {
			create('samples/basic', {
				kit: {
					moduleExtensions: ['.js', '.ts']
				}
			});
		}, /Duplicate matchers/);
	} finally {
		fs.unlinkSync(ts_foo);
	}
});

test('prevents route conflicts between groups', () => {
	assert.throws(
		() => create('samples/conflicting-groups'),
		/\(x\)\/a and \(y\)\/a occupy the same route/
	);
});

// TODO remove for 1.0
test('errors on encountering a declared layout', () => {
	assert.throws(
		() => create('samples/declared-layout'),
		/samples\/declared-layout\/\+layout-foo.svelte should be reimplemented with layout groups: https:\/\/kit\.svelte\.dev\/docs\/advanced-routing#advanced-layouts/
	);
});

test.run();

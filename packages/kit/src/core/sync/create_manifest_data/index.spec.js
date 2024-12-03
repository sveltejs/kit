import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assert, expect, test } from 'vitest';
import create_manifest_data from './index.js';
import options from '../../config/options.js';
import { sort_routes } from './sort.js';

const cwd = fileURLToPath(new URL('./test', import.meta.url));

/**
 * @param {string} dir
 * @param {import('@sveltejs/kit').Config} config
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

/** @param {import('types').PageNode} node */
function simplify_node(node) {
	/** @type {import('types').PageNode} */
	const simplified = {};

	if (node.component) simplified.component = node.component;
	if (node.universal) simplified.universal = node.universal;
	if (node.server) simplified.server = node.server;
	if (node.parent_id !== undefined) simplified.parent_id = node.parent_id;

	return simplified;
}

/** @param {import('types').RouteData} route */
function simplify_route(route) {
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

	expect(nodes.map(simplify_node)).toEqual([
		default_layout,
		default_error,
		{ component: 'samples/basic/+page.svelte' },
		{ component: 'samples/basic/about/+page.svelte' },
		{ component: 'samples/basic/blog/+page.svelte' },
		{ component: 'samples/basic/blog/[slug]/+page.svelte' }
	]);

	expect(routes.map(simplify_route)).toEqual([
		{
			id: '/',
			pattern: '/^/$/',
			page: { layouts: [0], errors: [1], leaf: 2 }
		},
		{
			id: '/about',
			pattern: '/^/about/?$/',
			page: { layouts: [0], errors: [1], leaf: 3 }
		},
		{
			id: '/blog.json',
			pattern: '/^/blog.json/?$/',
			endpoint: { file: 'samples/basic/blog.json/+server.js' }
		},
		{
			id: '/blog',
			pattern: '/^/blog/?$/',
			page: { layouts: [0], errors: [1], leaf: 4 }
		},
		{
			id: '/blog/[slug].json',
			pattern: '/^/blog/([^/]+?).json/?$/',
			endpoint: {
				file: 'samples/basic/blog/[slug].json/+server.ts'
			}
		},
		{
			id: '/blog/[slug]',
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

	expect(nodes.map(simplify_node)).toEqual([
		default_layout,
		default_error,
		{ component: 'samples/symlinks/routes/foo/index.svelte' },
		{ component: 'samples/symlinks/routes/index.svelte' }
	]);

	expect(routes).toEqual([
		{
			id: '/',
			pattern: '/^/$/',
			page: { layouts: [0], errors: [1], leaf: 1 }
		},

		{
			id: '/foo',
			pattern: '/^/foo/?$/',
			page: { layouts: [0], errors: [1], leaf: 2 }
		}
	]);
});

test('creates routes with layout', () => {
	const { nodes, routes } = create('samples/basic-layout');

	expect(nodes.map(simplify_node)).toEqual([
		{ component: 'samples/basic-layout/+layout.svelte' },
		default_error,
		{ component: 'samples/basic-layout/foo/+layout.svelte' },
		{ component: 'samples/basic-layout/+page.svelte' },
		{ component: 'samples/basic-layout/foo/+page.svelte' }
	]);

	expect(routes.map(simplify_route)).toEqual([
		{
			id: '/',
			pattern: '/^/$/',
			page: { layouts: [0], errors: [1], leaf: 3 }
		},

		{
			id: '/foo',
			pattern: '/^/foo/?$/',
			page: { layouts: [0, 2], errors: [1, undefined], leaf: 4 }
		}
	]);
});

test('succeeds when routes does not exist', () => {
	const { nodes, routes } = create('samples/basic/routes');
	expect(nodes.map(simplify_node)).toEqual([
		{ component: 'layout.svelte' },
		{ component: 'error.svelte' }
	]);
	expect(routes.map(simplify_route)).toEqual([
		{
			id: '/',
			pattern: '/^$/'
		}
	]);
});

test('encodes invalid characters', () => {
	const { nodes, routes } = create('samples/encoding');

	const quote = { component: 'samples/encoding/[x+22]/+page.svelte' };
	const hash = { component: 'samples/encoding/[x+23]/+page.svelte' };
	const question_mark = { component: 'samples/encoding/[x+3f]/+page.svelte' };

	expect(nodes.map(simplify_node)).toEqual([
		default_layout,
		default_error,
		quote,
		hash,
		question_mark
	]);

	expect(routes.map((p) => p.pattern.toString())).toEqual(
		[/^\/$/, /^\/%3[Ff]\/?$/, /^\/%23\/?$/, /^\/"\/?$/].map((pattern) => pattern.toString())
	);
});

test('sorts routes correctly', () => {
	const expected = [
		'/',
		'/a',
		'/b',
		'/b/[required]',
		'/c',
		'/c/bar',
		'/c/b[x].json',
		'/c/b[x]',
		'/c/foo',
		'/d/e',
		'/d/e[...rest]',
		'/e/f',
		'/e/[...rest]/f',
		'/f/static[...rest]',
		'/f/[...rest]static',
		'/g/[[optional]]/static',
		'/g/[required]',
		'/g/[...rest]/[required]',
		'/h/a/b',
		'/h/a/[required]/b',
		'/h/a/[...rest]/b',
		'/x/[...rest]',
		'/[...rest]/x',
		'/[...rest]/x/[...deep_rest]/y',
		'/[...rest]/x/[...deep_rest]',
		'/[required=matcher]',
		'/[required]',
		'/[...rest]'
	];

	const routes = /** @type {import('types').RouteData[]} */ (expected.map((id) => ({ id })));

	const actual = sort_routes(routes.sort(() => (Math.random() > 0.5 ? 1 : -1))).map(
		(route) => route.id
	);

	expect(actual).toEqual(expected);
});

test('sorts routes with rest correctly', () => {
	const { nodes, routes } = create('samples/rest');

	expect(nodes.map(simplify_node)).toEqual([
		default_layout,
		default_error,
		{
			component: 'samples/rest/a/[...rest]/+page.svelte',
			server: 'samples/rest/a/[...rest]/+page.server.js'
		},
		{
			component: 'samples/rest/b/[...rest]/+page.svelte',
			server: 'samples/rest/b/[...rest]/+page.server.ts'
		}
	]);

	expect(routes.map(simplify_route)).toEqual([
		{
			id: '/',
			pattern: '/^/$/'
		},
		{
			id: '/a',
			pattern: '/^/a/?$/'
		},
		{
			id: '/a/[...rest]',
			pattern: '/^/a(?:/(.*))?/?$/',
			page: { layouts: [0], errors: [1], leaf: 2 }
		},
		{
			id: '/b',
			pattern: '/^/b/?$/'
		},
		{
			id: '/b/[...rest]',
			pattern: '/^/b(?:/(.*))?/?$/',
			page: { layouts: [0], errors: [1], leaf: 3 }
		}
	]);
});

test('allows rest parameters inside segments', () => {
	const { nodes, routes } = create('samples/rest-prefix-suffix');

	expect(nodes.map(simplify_node)).toEqual([
		default_layout,
		default_error,
		{
			component: 'samples/rest-prefix-suffix/prefix-[...rest]/+page.svelte'
		}
	]);

	expect(routes.map(simplify_route)).toEqual([
		{
			id: '/',
			pattern: '/^/$/'
		},
		{
			id: '/prefix-[...rest]',
			pattern: '/^/prefix-(.*?)/?$/',
			page: { layouts: [0], errors: [1], leaf: 2 }
		},
		{
			id: '/[...rest].json',
			pattern: '/^/(.*?).json/?$/',
			endpoint: {
				file: 'samples/rest-prefix-suffix/[...rest].json/+server.js'
			}
		}
	]);
});

test('optional parameters', () => {
	const { nodes, routes } = create('samples/optional');

	expect(
		nodes
			.map(simplify_node)
			// for some reason linux and windows have a different order, which is why
			// we need sort the nodes using a sort function (doesn't work either without),
			// resulting in the following expected node order
			.sort((a, b) => a.component?.localeCompare(b.component ?? '') ?? 1)
	).toEqual([
		default_error,
		default_layout,
		{
			component: 'samples/optional/[[optional]]/+page.svelte'
		},
		{
			component: 'samples/optional/nested/[[optional]]/sub/+page.svelte'
		},
		{
			component: 'samples/optional/prefix[[suffix]]/+page.svelte'
		}
	]);

	expect(routes.map(simplify_route)).toEqual([
		{
			id: '/',
			pattern: '/^/$/'
		},
		{
			id: '/[[foo]]bar',
			pattern: '/^/([^/]*)?bar/?$/',
			endpoint: { file: 'samples/optional/[[foo]]bar/+server.js' }
		},
		{ id: '/nested', pattern: '/^/nested/?$/' },
		{
			id: '/nested/[[optional]]/sub',
			pattern: '/^/nested(?:/([^/]+))?/sub/?$/',
			page: {
				layouts: [0],
				errors: [1],
				// see above, linux/windows difference -> find the index dynamically
				leaf: nodes.findIndex((node) => node.component?.includes('nested/[[optional]]'))
			}
		},
		{ id: '/nested/[[optional]]', pattern: '/^/nested(?:/([^/]+))?/?$/' },
		{
			id: '/prefix[[suffix]]',
			pattern: '/^/prefix([^/]*)?/?$/',
			page: {
				layouts: [0],
				errors: [1],
				// see above, linux/windows difference -> find the index dynamically
				leaf: nodes.findIndex((node) => node.component?.includes('prefix[[suffix]]'))
			}
		},
		{
			id: '/[[optional]]',
			pattern: '/^(?:/([^/]+))?/?$/',
			page: {
				layouts: [0],
				errors: [1],
				// see above, linux/windows difference -> find the index dynamically
				leaf: nodes.findIndex((node) => node.component?.includes('optional/[[optional]]'))
			}
		}
	]);
});

test('nested optionals', () => {
	const { nodes, routes } = create('samples/nested-optionals');
	expect(nodes.map(simplify_node)).toEqual([
		default_layout,
		default_error,
		{ component: 'samples/nested-optionals/[[a]]/[[b]]/+page.svelte' }
	]);

	expect(routes.map(simplify_route)).toEqual([
		{
			id: '/',
			pattern: '/^/$/'
		},
		{
			id: '/[[a]]/[[b]]',
			pattern: '/^(?:/([^/]+))?(?:/([^/]+))?/?$/',
			page: {
				layouts: [0],
				errors: [1],
				leaf: nodes.findIndex((node) => node.component?.includes('/[[a]]/[[b]]'))
			}
		},
		{
			id: '/[[a]]',
			pattern: '/^(?:/([^/]+))?/?$/'
		}
	]);
});

test('group preceding optional parameters', () => {
	const { nodes, routes } = create('samples/optional-group');

	expect(
		nodes
			.map(simplify_node)
			// for some reason linux and windows have a different order, which is why
			// we need sort the nodes using a sort function (doesn't work either without),
			// resulting in the following expected node order
			.sort((a, b) => a.component?.localeCompare(b.component ?? '') ?? 1)
	).toEqual([
		default_error,
		default_layout,
		{
			component: 'samples/optional-group/[[optional]]/(group)/+page.svelte'
		}
	]);

	expect(routes.map(simplify_route)).toEqual([
		{
			id: '/',
			pattern: '/^/$/'
		},
		{
			id: '/[[optional]]/(group)',
			pattern: '/^(?:/([^/]+))?/?$/',
			page: {
				layouts: [0],
				errors: [1],
				// see above, linux/windows difference -> find the index dynamically
				leaf: nodes.findIndex((node) =>
					node.component?.includes('optional-group/[[optional]]/(group)')
				)
			}
		},
		{
			id: '/[[optional]]',
			pattern: '/^(?:/([^/]+))?/?$/'
		}
	]);
});

test('ignores files and directories with leading underscores', () => {
	const { routes } = create('samples/hidden-underscore');

	expect(routes.map((r) => r.endpoint?.file).filter(Boolean)).toEqual([
		'samples/hidden-underscore/e/f/g/h/+server.js'
	]);
});

test('ignores files and directories with leading dots except .well-known', () => {
	const { routes } = create('samples/hidden-dot');

	expect(routes.map((r) => r.endpoint?.file).filter(Boolean)).toEqual([
		'samples/hidden-dot/.well-known/dnt-policy.txt/+server.js'
	]);
});

test('allows multiple slugs', () => {
	const { routes } = create('samples/multiple-slugs');

	expect(routes.filter((route) => route.endpoint).map(simplify_route)).toEqual([
		{
			id: '/[file].[ext]',
			pattern: '/^/([^/]+?).([^/]+?)/?$/',
			endpoint: {
				file: 'samples/multiple-slugs/[file].[ext]/+server.js'
			}
		}
	]);
});

test('fails if dynamic params are not separated', () => {
	assert.throws(() => {
		create('samples/invalid-params');
	}, /Invalid route \/\[foo\]\[bar\] — parameters must be separated/);
});

test('ignores things that look like lockfiles', () => {
	const { routes } = create('samples/lockfiles');

	expect(routes.map(simplify_route)).toEqual([
		{
			id: '/',
			pattern: '/^/$/'
		},
		{
			id: '/foo',
			pattern: '/^/foo/?$/',
			endpoint: {
				file: 'samples/lockfiles/foo/+server.js'
			}
		}
	]);
});

test('works with custom extensions', () => {
	const { nodes, routes } = create('samples/custom-extension', {
		extensions: ['.jazz', '.beebop', '.funk', '.svelte']
	});

	expect(nodes.map(simplify_node)).toEqual([
		default_layout,
		default_error,
		{ component: 'samples/custom-extension/+page.funk' },
		{ component: 'samples/custom-extension/about/+page.jazz' },
		{ component: 'samples/custom-extension/blog/+page.svelte' },
		{ component: 'samples/custom-extension/blog/[slug]/+page.beebop' }
	]);

	expect(routes.map(simplify_route)).toEqual([
		{
			id: '/',
			pattern: '/^/$/',
			page: { layouts: [0], errors: [1], leaf: 2 }
		},
		{
			id: '/about',
			pattern: '/^/about/?$/',
			page: { layouts: [0], errors: [1], leaf: 3 }
		},
		{
			id: '/blog.json',
			pattern: '/^/blog.json/?$/',
			endpoint: {
				file: 'samples/custom-extension/blog.json/+server.js'
			}
		},
		{
			id: '/blog',
			pattern: '/^/blog/?$/',
			page: { layouts: [0], errors: [1], leaf: 4 }
		},
		{
			id: '/blog/[slug].json',
			pattern: '/^/blog/([^/]+?).json/?$/',
			endpoint: {
				file: 'samples/custom-extension/blog/[slug].json/+server.js'
			}
		},
		{
			id: '/blog/[slug]',
			pattern: '/^/blog/([^/]+?)/?$/',
			page: { layouts: [0], errors: [1], leaf: 5 }
		}
	]);
});

test('lists static assets', () => {
	const { assets } = create('samples/basic');

	expect(assets).toEqual([
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
	const { nodes, routes } = create('samples/nested-errors');

	expect(nodes.map(simplify_node)).toEqual([
		default_layout,
		default_error,
		{ component: 'samples/nested-errors/foo/+layout.svelte' },
		{ component: 'samples/nested-errors/foo/bar/+error.svelte' },
		{ component: 'samples/nested-errors/foo/bar/baz/+layout.svelte' },
		{ component: 'samples/nested-errors/foo/bar/baz/+error.svelte' },
		{ component: 'samples/nested-errors/foo/bar/baz/+page.svelte' }
	]);

	expect(routes.map(simplify_route)).toEqual([
		{
			id: '/',
			pattern: '/^/$/'
		},
		{
			id: '/foo',
			pattern: '/^/foo/?$/'
		},
		{
			id: '/foo/bar',
			pattern: '/^/foo/bar/?$/'
		},
		{
			id: '/foo/bar/baz',
			pattern: '/^/foo/bar/baz/?$/',
			page: { layouts: [0, 2, undefined, 4], errors: [1, undefined, 3, 5], leaf: 6 }
		}
	]);
});

test('creates routes with named layouts', () => {
	const { nodes, routes } = create('samples/named-layouts');

	expect(nodes.map(simplify_node)).toEqual([
		// layouts
		{ component: 'samples/named-layouts/+layout.svelte' }, // 0
		default_error, // 1
		{
			component: 'samples/named-layouts/(special)/+layout.svelte',
			universal: 'samples/named-layouts/(special)/+layout.js',
			server: 'samples/named-layouts/(special)/+layout.server.js'
		}, // 2
		{ component: 'samples/named-layouts/(special)/(alsospecial)/+layout.svelte' }, // 3
		{ component: 'samples/named-layouts/a/+layout.svelte' }, // 4
		{ component: 'samples/named-layouts/b/c/+layout.svelte' }, // 5
		{ component: 'samples/named-layouts/b/d/(special)/+layout.svelte' }, // 6
		{ component: 'samples/named-layouts/b/d/(special)/(extraspecial)/+layout.svelte' }, // 7

		// pages
		{ component: 'samples/named-layouts/(special)/(alsospecial)/b/c/c1/+page.svelte' }, // 8
		{ component: 'samples/named-layouts/(special)/a/a2/+page.svelte' }, // 9
		{ component: 'samples/named-layouts/a/a1/+page.svelte' }, // 10
		{ component: 'samples/named-layouts/b/c/c2/+page@.svelte', parent_id: '' }, // 11
		{ component: 'samples/named-layouts/b/d/(special)/+page.svelte' }, // 12
		{ component: 'samples/named-layouts/b/d/(special)/(extraspecial)/d2/+page.svelte' }, // 13
		{
			component: 'samples/named-layouts/b/d/(special)/(extraspecial)/d3/+page@(special).svelte',
			parent_id: '(special)'
		}, // 14
		{ component: 'samples/named-layouts/b/d/d1/+page.svelte' } // 15
	]);

	expect(routes.filter((route) => route.page).map(simplify_route)).toEqual([
		{
			id: '/a/a1',
			pattern: '/^/a/a1/?$/',
			page: { layouts: [0, 4], errors: [1, undefined], leaf: 10 }
		},
		{
			id: '/(special)/a/a2',
			pattern: '/^/a/a2/?$/',
			page: { layouts: [0, 2], errors: [1, undefined], leaf: 9 }
		},
		{
			id: '/(special)/(alsospecial)/b/c/c1',
			pattern: '/^/b/c/c1/?$/',
			page: { layouts: [0, 2, 3], errors: [1, undefined, undefined], leaf: 8 }
		},
		{
			id: '/b/c/c2',
			pattern: '/^/b/c/c2/?$/',
			page: { layouts: [0], errors: [1], leaf: 11 }
		},
		{
			id: '/b/d/(special)',
			pattern: '/^/b/d/?$/',
			page: { layouts: [0, 6], errors: [1, undefined], leaf: 12 }
		},
		{
			id: '/b/d/d1',
			pattern: '/^/b/d/d1/?$/',
			page: { layouts: [0], errors: [1], leaf: 15 }
		},
		{
			id: '/b/d/(special)/(extraspecial)/d2',
			pattern: '/^/b/d/d2/?$/',
			page: { layouts: [0, 6, 7], errors: [1, undefined, undefined], leaf: 13 }
		},
		{
			id: '/b/d/(special)/(extraspecial)/d3',
			pattern: '/^/b/d/d3/?$/',
			page: { layouts: [0, 6], errors: [1, undefined], leaf: 14 }
		}
	]);
});

test('handles pages without .svelte file', () => {
	const { nodes, routes } = create('samples/page-without-svelte-file');

	expect(nodes.map(simplify_node)).toEqual([
		default_layout,
		default_error,
		{ component: 'samples/page-without-svelte-file/error/+error.svelte' },
		{ component: 'samples/page-without-svelte-file/layout/+layout.svelte' },
		{ ...default_layout, universal: 'samples/page-without-svelte-file/layout/exists/+layout.js' },
		{ component: 'samples/page-without-svelte-file/+page.svelte' },
		{ universal: 'samples/page-without-svelte-file/error/[...path]/+page.js' },
		{ component: 'samples/page-without-svelte-file/layout/exists/+page.svelte' },
		{ server: 'samples/page-without-svelte-file/layout/redirect/+page.server.js' }
	]);

	expect(routes.map(simplify_route)).toEqual([
		{
			id: '/',
			pattern: '/^/$/',
			page: { layouts: [0], errors: [1], leaf: 5 }
		},
		{
			id: '/error',
			pattern: '/^/error/?$/'
		},
		{
			id: '/error/[...path]',
			pattern: '/^/error(?:/(.*))?/?$/',
			page: { layouts: [0, undefined], errors: [1, 2], leaf: 6 }
		},
		{
			id: '/layout',
			pattern: '/^/layout/?$/'
		},
		{
			id: '/layout/exists',
			pattern: '/^/layout/exists/?$/',
			page: { layouts: [0, 3, 4], errors: [1, undefined, undefined], leaf: 7 }
		},
		{
			id: '/layout/redirect',
			pattern: '/^/layout/redirect/?$/',
			page: { layouts: [0, 3], errors: [1, undefined], leaf: 8 }
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

	expect(matchers).toEqual({
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
		/The "\/\(x\)\/a" and "\/\(y\)\/a" routes conflict with each other/
	);
});

test('errors with multiple layouts on same directory', () => {
	assert.throws(
		() => create('samples/multiple-layouts'),
		/^Multiple layout component files found in samples\/multiple-layouts\/ : \+layout\.svelte and \+layout@\.svelte/
	);
});

test('errors with multiple pages on same directory', () => {
	assert.throws(
		() => create('samples/multiple-pages'),
		/^Multiple page component files found in samples\/multiple-pages\/ : \+page\.svelte and \+page@\.svelte/
	);
});

test('errors with both ts and js handlers for the same route', () => {
	assert.throws(
		() => create('samples/conflicting-ts-js-handlers-page'),
		/^Multiple universal page module files found in samples\/conflicting-ts-js-handlers-page\/ : \+page\.js and \+page\.ts/
	);

	assert.throws(
		() => create('samples/conflicting-ts-js-handlers-layout'),
		/^Multiple server layout module files found in samples\/conflicting-ts-js-handlers-layout\/ : \+layout\.server\.js and \+layout\.server\.ts/
	);

	assert.throws(
		() => create('samples/conflicting-ts-js-handlers-server'),
		/^Multiple endpoint files found in samples\/conflicting-ts-js-handlers-server\/ : \+server\.js and \+server\.ts/
	);
});

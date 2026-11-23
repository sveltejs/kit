import { describe, test, expect } from 'vitest';
import { get_route_pattern, matches, overlaps, plan_functions, resolve_runtime } from './utils.js';

/**
 * Helper to create a static route segment
 * @param {string} content
 * @returns {{ rest: boolean, dynamic: boolean, content: string }}
 */
function static_segment(content) {
	return { rest: false, dynamic: false, content };
}

/**
 * Helper to create a dynamic route segment
 * @param {string} content
 * @returns {{ rest: boolean, dynamic: boolean, content: string }}
 */
function dynamic_segment(content) {
	return { rest: false, dynamic: true, content };
}

/**
 * Helper to create a rest route segment
 * @param {string} content
 * @returns {{ rest: boolean, dynamic: boolean, content: string }}
 */
function rest_segment(content) {
	return { rest: true, dynamic: true, content };
}

describe('resolve_runtime', () => {
	test('edge: true cannot be combined with nodeVersion', () => {
		expect(() => resolve_runtime({ edge: true, nodeVersion: 'nodejs24.x' })).toThrow(
			'Cannot combine `edge: true` with `nodeVersion`'
		);
	});

	test('rejects a nodeVersion that is not in the nodejs<major>.x format', () => {
		// @ts-expect-error
		expect(() => resolve_runtime({ nodeVersion: '24' })).toThrow('Invalid `nodeVersion` "24"');
	});
});

describe('matches', () => {
	test('two identical static routes match', () => {
		expect(
			matches(
				[static_segment('blog'), static_segment('post')],
				[static_segment('blog'), static_segment('post')]
			)
		).toBe(true);
	});

	test('static segment mismatch returns false', () => {
		expect(matches([static_segment('blog')], [static_segment('about')])).toBe(false);
	});

	test('dynamic segment matches any static segment', () => {
		expect(matches([static_segment('blog')], [dynamic_segment('[slug]')])).toBe(true);
	});

	test('rest segment at end matches everything', () => {
		expect(
			matches([static_segment('blog'), static_segment('post')], [rest_segment('[...rest]')])
		).toBe(true);
	});

	test('rest-only route matches any route', () => {
		expect(
			matches(
				[static_segment('a'), static_segment('b'), static_segment('c')],
				[rest_segment('[...rest]')]
			)
		).toBe(true);
	});

	test('rest segment matches remaining segments', () => {
		expect(
			matches(
				[static_segment('blog'), static_segment('2024'), static_segment('post')],
				[static_segment('blog'), rest_segment('[...rest]')]
			)
		).toBe(true);
	});

	test('empty segments (index routes)', () => {
		expect(matches([], [])).toBe(false);
	});

	test('mismatched lengths without rest return false', () => {
		expect(
			matches([static_segment('blog'), static_segment('post')], [static_segment('blog')])
		).toBe(false);
	});

	test('rest with following segments', () => {
		expect(
			matches(
				[static_segment('a'), static_segment('b'), static_segment('page')],
				[rest_segment('[...rest]'), static_segment('page')]
			)
		).toBe(true);
	});

	test('rest with following segments that do not match', () => {
		expect(
			matches(
				[static_segment('a'), static_segment('b'), static_segment('other')],
				[rest_segment('[...rest]'), static_segment('page')]
			)
		).toBe(false);
	});

	test('a has trailing rest and b is shorter', () => {
		expect(matches([rest_segment('[...rest]')], [static_segment('blog')])).toBe(true);
	});

	test('a is longer without rest in b', () => {
		expect(matches([static_segment('a'), static_segment('b')], [static_segment('a')])).toBe(false);
	});

	test('b is longer without rest in a', () => {
		expect(matches([static_segment('a')], [static_segment('a'), static_segment('b')])).toBe(false);
	});

	test('dynamic in a matches static in b', () => {
		expect(matches([dynamic_segment('[id]')], [static_segment('blog')])).toBe(true);
	});

	test('both dynamic segments match', () => {
		expect(matches([dynamic_segment('[id]')], [dynamic_segment('[slug]')])).toBe(true);
	});
});

/** @param {string} id */
function segments(id) {
	return id
		.split('/')
		.filter(Boolean)
		.map((content) => ({
			content,
			dynamic: content.includes('['),
			rest: content.includes('[...')
		}));
}

describe('overlaps', () => {
	test.each([
		['/a/b', '/a/b', true],
		['/a/b', '/a/c', false],
		['/a', '/a/b', false],
		['/a/[id]', '/a/b', true],
		['/[a]/b', '/x/[c]', true],
		['/a/[...rest]', '/a', true],
		['/a/[...rest]', '/b/c', false],
		['/[...rest]/end', '/a/b/end', true],
		['/[...rest]/end', '/a/b/other', false],
		['/[[lang]]/about', '/about', true],
		['/[[lang]]/about', '/en/about', true],
		['/[[lang]]/about', '/en/contact', false],
		['/[...a]/x', '/[...b]/y', false]
	])('%s and %s: %s', (a, b, expected) => {
		expect(overlaps(segments(a), segments(b))).toBe(expected);
		expect(overlaps(segments(b), segments(a))).toBe(expected);
	});
});

// URLPattern is only a global from Node 23.8
describe.skipIf(!('URLPattern' in globalThis))('plan_functions', () => {
	/**
	 * Plans functions for route ids given in priority order and returns a function that
	 * resolves a path to the runtime and route that would answer it on Netlify
	 * @param {Record<string, { runtime?: string, split?: boolean }>} config
	 */
	function plan(config) {
		const routes = Object.keys(config).map((id) => ({
			id,
			prerender: false,
			segments: segments(id)
		}));
		const functions = plan_functions(routes, (route) => ({
			runtime: 'node',
			split: false,
			...config[route.id]
		}));

		/** @param {string} pathname */
		const resolve = (pathname) => {
			/** @param {string} pattern */
			const test = (pattern) =>
				new /** @type {any} */ (globalThis).URLPattern({ pathname: pattern }).test({ pathname });
			const answering = functions.filter((fn) => fn.patterns.some(test) && !fn.exclude.some(test));
			expect(answering, pathname).toHaveLength(1);

			const route = answering[0].routes.find((route) => test(get_route_pattern(route)));
			return `${answering[0].runtime} ${route?.id}`;
		};

		return { functions, resolve };
	}

	test('an edge route does not shadow a higher priority route', () => {
		const { resolve } = plan({
			'/blog/[slug]': {},
			'/[...rest]': { runtime: 'edge' }
		});

		expect(resolve('/blog/a')).toBe('node /blog/[slug]');
		expect(resolve('/a/b')).toBe('edge /[...rest]');
	});

	test('a group does not answer for a split route it overlaps', () => {
		const { functions, resolve } = plan({
			'/': {},
			'/about': { split: true },
			'/[slug]': {}
		});

		expect(functions).toHaveLength(2);
		expect(resolve('/')).toBe('node /');
		expect(resolve('/about')).toBe('node /about');
		expect(resolve('/a')).toBe('node /[slug]');
	});

	test('a route starts a new group when excluding for it would hide a higher priority route', () => {
		const { functions, resolve } = plan({
			'/[a]/b': {},
			'/x/[c]': { split: true },
			'/[...rest]': {}
		});

		expect(functions).toHaveLength(3);
		expect(resolve('/x/b')).toBe('node /[a]/b');
		expect(resolve('/x/c')).toBe('node /x/[c]');
		expect(resolve('/a/b/c')).toBe('node /[...rest]');
	});

	test('routes of a function stay in priority order', () => {
		const { functions } = plan({
			'/docs': {},
			'/docs/[id]': {},
			'/docs/[...rest]': {}
		});

		expect(functions.map((fn) => fn.routes.map((route) => route.id))).toEqual([
			['/docs', '/docs/[id]', '/docs/[...rest]']
		]);
	});

	test('routes with the same pattern need the same config', () => {
		expect(() =>
			plan({
				'/blog/[id=number]': {},
				'/blog/[slug]': { runtime: 'edge' }
			})
		).toThrow('normalize to the same Netlify pattern (/blog/:param1)');
	});
});

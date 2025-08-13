import { assert, test } from 'vitest';
import { get_pathname, pattern_to_src } from '../utils.js';

// workaround so that TypeScript doesn't follow that import which makes it pick up that file and then error on missing import aliases
const { parse_route_id } = await import('../../kit/src/' + 'utils/routing.js');

/**
 * @param {import('@sveltejs/kit').RouteDefinition<any>['segments']} segments
 * @param {string} expected
 */
function run_get_pathname_test(segments, expected) {
	const route = /** @type {import('@sveltejs/kit').RouteDefinition<any>} */ ({ segments });
	assert.equal(get_pathname(route), expected);
}

test('get_pathname for simple route', () => {
	run_get_pathname_test([{ content: 'foo', dynamic: false, rest: false }], 'foo');
});

test('get_pathname for simple route with multiple segments', () => {
	run_get_pathname_test(
		[
			{ content: 'foo', dynamic: false, rest: false },
			{ content: 'bar', dynamic: false, rest: false }
		],
		'foo/bar'
	);
});

test('get_pathname for route with parameters', () => {
	run_get_pathname_test(
		[
			{ content: 'foo', dynamic: false, rest: false },
			{ content: '[bar]', dynamic: true, rest: false }
		],
		'foo/$1'
	);
});

test('get_pathname for route with parameters within segment', () => {
	run_get_pathname_test(
		[
			{ content: 'foo-[bar]', dynamic: true, rest: false },
			{ content: '[baz]-buz', dynamic: true, rest: false }
		],
		'foo-$1/$2-buz'
	);
});

test('get_pathname for route with optional parameters within segment', () => {
	run_get_pathname_test(
		[
			{ content: 'foo-[[bar]]', dynamic: true, rest: false },
			{ content: '[[baz]]-buz', dynamic: true, rest: false }
		],
		'foo-$1/$2-buz'
	);
});

test('get_pathname for route with rest parameter', () => {
	run_get_pathname_test(
		[
			{ content: 'foo', dynamic: false, rest: false },
			{ content: '[[...rest]]', dynamic: true, rest: true }
		],
		'foo$1'
	);
});

test('get_pathname for route with required and rest parameter', () => {
	run_get_pathname_test(
		[
			{ content: '[foo]', dynamic: true, rest: false },
			{ content: '[...rest]', dynamic: true, rest: true }
		],
		'$1$2'
	);
});

test('get_pathname for route with required and optional parameter', () => {
	run_get_pathname_test(
		[
			{ content: '[foo]', dynamic: true, rest: false },
			{ content: '[[optional]]', dynamic: true, rest: true }
		],
		'$1$2'
	);
});

test('get_pathname for route with required and optional parameter', () => {
	run_get_pathname_test(
		[
			{ content: '[foo]', dynamic: true, rest: false },
			{ content: '[[...rest]]', dynamic: true, rest: true },
			{ content: 'bar', dynamic: false, rest: false }
		],
		'$1$2/bar'
	);
});

/**
 * @param {string} route_id
 * @param {string} expected
 */
function run_pattern_to_src_test(route_id, expected) {
	const { pattern } = parse_route_id(route_id);
	assert.equal(pattern_to_src(pattern.toString()), expected);
}

test('pattern_to_src for simple route', () => {
	run_pattern_to_src_test('/', '^/?');
});

test('pattern_to_src for route with parameters', () => {
	run_pattern_to_src_test('/foo/[bar]', '^/foo/([^/]+?)/?');
});

test('pattern_to_src for route with optional parameters', () => {
	run_pattern_to_src_test('/foo/[[bar]]', '^/foo(/[^/]+)?/?');
});

test('pattern_to_src for route with optional parameter in the middle', () => {
	run_pattern_to_src_test('/foo/[[bar]]/baz', '^/foo(/[^/]+)?/baz/?');
});

test('pattern_to_src for route with rest parameter', () => {
	run_pattern_to_src_test('/foo/[...bar]', '^/foo(/[^]*)?/?');
});

test('pattern_to_src for route with rest parameter in the middle', () => {
	run_pattern_to_src_test('/foo/[...bar]/baz', '^/foo(/[^]*)?/baz/?');
});

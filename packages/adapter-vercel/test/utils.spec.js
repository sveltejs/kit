import { assert, test } from 'vitest';
import { get_pathname } from '../utils.js';

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

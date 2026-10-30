import process from 'node:process';
import { assert, test, describe } from 'vitest';
import { get_pathname, parse_isr_expiration, pattern_to_src, resolve_runtime } from '../utils.js';

// workaround so that TypeScript doesn't follow that import which makes it pick up that file and then error on missing import aliases
const { parse_route_id } = await import(
	new URL('../../kit/src/' + 'utils/routing.js', import.meta.url).href
);

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

describe('parse_isr_expiration', () => {
	test.each(
		/** @type {const} */ ([
			[1, 1],
			['1', 1],
			[false, false],
			['false', false]
		])
	)('works for valid inputs ($0)', (input, output) => {
		const result = parse_isr_expiration(input, '/isr');
		assert.equal(result, output);
	});

	test('does not allow floats', () => {
		assert.throws(() => parse_isr_expiration(1.5, '/isr'), /should be an integer, in \/isr/);
	});

	test('does not allow `true`', () => {
		const val = /** @type {false} */ (true);
		assert.throws(() => parse_isr_expiration(val, '/isr'), /should be an integer, in \/isr/);
	});

	test('does not allow negative numbers', () => {
		assert.throws(() => parse_isr_expiration(-1, '/isr'), /should be non-negative, in \/isr/);
	});

	test('does not allow strings that do not parse to valid numbers', () => {
		assert.throws(
			() => parse_isr_expiration('foo', '/isr'),
			/value was a string but could not be parsed as an integer, in \/isr/
		);
	});

	test('does not allow strings that parse to floats', () => {
		assert.throws(
			() => parse_isr_expiration('1.1', '/isr'),
			/value was a string but could not be parsed as an integer, in \/isr/
		);
	});
});

describe('resolve_runtime', () => {
	test('prefers override_key over default_key', () => {
		const result = resolve_runtime('nodejs20.x', 'experimental_bun1.x');
		assert.equal(result, 'bun1.x');
	});

	test('uses default_key when override_key is undefined', () => {
		const result = resolve_runtime('experimental_bun1.x');
		assert.equal(result, 'bun1.x');
	});

	test.each(['node18.x', 'nodejs028.x', 'nodejs18.x', 'nodejs33.x', 'nodejs100.x', 'nodejs2,.x'])(
		'throws an error when resolving to an invalid runtime (%s)',
		(runtime) => {
			assert.throws(() => resolve_runtime(runtime), /Unsupported runtime/);
		}
	);

	test.each(['nodejs20.x', 'nodejs22.x', 'nodejs24.x', 'nodejs26.x', 'nodejs96.x', 'nodejs98.x'])(
		'accepts %s',
		(runtime) => {
			assert.equal(resolve_runtime(runtime), runtime);
		}
	);

	test.each(['bun1.x', 'edge'])('accepts %s', (runtime) => {
		assert.equal(resolve_runtime(runtime), runtime);
	});
});

describe('resolve_runtime with node detected', () => {
	/**
	 * @param {string} node_version
	 * @param {() => void} fn
	 */
	function with_node(node_version, fn) {
		const version = Object.getOwnPropertyDescriptor(process, 'version');
		Object.defineProperty(process, 'version', { value: `v${node_version}`, configurable: true });
		try {
			fn();
		} finally {
			if (version) Object.defineProperty(process, 'version', version);
		}
	}

	test.each([
		['20.0.0', 'nodejs20.x'],
		['22.0.0', 'nodejs22.x'],
		['24.1.0', 'nodejs24.x'],
		['26.0.0', 'nodejs26.x'],
		['28.0.0', 'nodejs28.x'],
		['96.1.0', 'nodejs96.x'],
		['98.0.0', 'nodejs98.x']
	])('detects Node %s', (version, runtime) => {
		with_node(version, () => {
			assert.equal(resolve_runtime(undefined, undefined), runtime);
		});
	});

	test('an explicit nodejs26.x override wins over the detected version', () => {
		with_node('24.0.0', () => {
			assert.equal(resolve_runtime(undefined, 'nodejs26.x'), 'nodejs26.x');
		});
	});

	test.each(['18.0.0', '25.0.0', '27.0.0'])(
		'throws for an unsupported Node major (%s)',
		(version) => {
			with_node(version, () => {
				assert.throws(
					() => resolve_runtime(undefined, undefined),
					/Unsupported Node\.js version.*Please use an even Node version to build your project/
				);
			});
		}
	);
});

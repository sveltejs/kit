import { assert, test, describe } from 'vitest';
import { parse_isr_expiration, pattern_to_src, resolve_runtime } from './utils.js';

// workaround so that TypeScript doesn't follow that import which makes it pick up that file and then error on missing import aliases
const { parse_route_id } = await import(
	new URL('../kit/src/' + 'utils/routing.js', import.meta.url).href
);

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
	run_pattern_to_src_test('/foo/[[bar]]', '^/foo(?:/([^/]+))?/?');
});

test('pattern_to_src for route with optional parameter in the middle', () => {
	run_pattern_to_src_test('/foo/[[bar]]/baz', '^/foo(?:/([^/]+))?/baz/?');
});

test('pattern_to_src for route with rest parameter', () => {
	run_pattern_to_src_test('/foo/[...bar]', '^/foo(?:/([^]*))?/?');
});

test('pattern_to_src for route with rest parameter in the middle', () => {
	run_pattern_to_src_test('/foo/[...bar]/baz', '^/foo(?:/([^]*))?/baz/?');
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
		const result = resolve_runtime('nodejs20.x', 'bun1.x');
		assert.equal(result, 'bun1.x');
	});

	test('uses default_key when override_key is undefined', () => {
		const result = resolve_runtime('bun1.x');
		assert.equal(result, 'bun1.x');
	});

	test('throws an error when resolving to an invalid runtime', () => {
		assert.throws(() => resolve_runtime('node18.x', undefined), /Unsupported runtime: node18.x/);
	});

	test('accepts a minor-pinned bun runtime', () => {
		const result = resolve_runtime('bun1.4.x');
		assert.equal(result, 'bun1.4.x');
	});

	test('throws an error for an unsupported bun minor', () => {
		assert.throws(() => resolve_runtime('bun1.9.x', undefined), /Unsupported runtime: bun1.9.x/);
	});
});

describe('resolve_runtime with bun detected', () => {
	/** @param {string} bun_version */
	function with_bun(bun_version, fn) {
		const descriptor = Object.getOwnPropertyDescriptor(process.versions, 'bun');
		Object.defineProperty(process.versions, 'bun', { value: bun_version, configurable: true });
		try {
			fn();
		} finally {
			if (descriptor) Object.defineProperty(process.versions, 'bun', descriptor);
			else delete process.versions.bun;
		}
	}

	test('pins the minor when the bun version is supported', () => {
		with_bun('1.4.2', () => {
			assert.equal(resolve_runtime(undefined, undefined), 'bun1.4.x');
		});
	});

	test('falls back to bun1.x for an unsupported minor', () => {
		with_bun('1.5.3', () => {
			assert.equal(resolve_runtime(undefined, undefined), 'bun1.x');
		});
	});

	test('falls back to bun1.x for an older supported minor', () => {
		with_bun('1.3.14', () => {
			assert.equal(resolve_runtime(undefined, undefined), 'bun1.x');
		});
	});

	test('throws for a bun major other than 1', () => {
		with_bun('2.0.0', () => {
			assert.throws(() => resolve_runtime(undefined, undefined), /Unsupported Bun version: 2/);
		});
	});
});

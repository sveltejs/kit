import process from 'node:process';
import { assert, test, describe } from 'vitest';
import {
	escape_src,
	get_uniform_trailing_slash,
	parse_isr_expiration,
	pattern_to_src,
	resolve_runtime,
	trailing_slash_redirects
} from './utils.js';

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

describe('escape_src', () => {
	test('matches prerendered paths literally', () => {
		for (const path of ['/account/x|.*', '/blog/(a)[b]{1}+?', '/a$', '/a\\/b', '/^a']) {
			const regex = new RegExp(`^${escape_src(path)}$`);
			assert.ok(regex.test(path), path);
		}

		const regex = new RegExp(`^${escape_src('/account/x|.*')}$`);
		assert.notOk(regex.test('/'));
		assert.notOk(regex.test('/_app/immutable/entry/start.js'));
	});

	test('does not end with `$` or contain `\\/`', () => {
		assert.equal(escape_src('/a$'), '/a\\x24');
		assert.equal(escape_src('/a\\/b'), '/a\\x5c/b');
	});
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

	test.each(['node18.x', 'nodejs028.x', 'nodejs18.x', 'nodejs33.x', 'nodejs100.x', 'nodejs2,.x'])(
		'throws an error when resolving to an invalid runtime (%s)',
		(runtime) => {
			assert.throws(() => resolve_runtime(runtime), /Unsupported runtime/);
		}
	);

	test('accepts a minor-pinned bun runtime', () => {
		const result = resolve_runtime('bun1.4.x');
		assert.equal(result, 'bun1.4.x');
	});

	test.each(['nodejs22.x', 'nodejs24.x', 'nodejs26.x', 'nodejs96.x', 'nodejs98.x'])(
		'accepts %s',
		(runtime) => {
			assert.equal(resolve_runtime(runtime), runtime);
		}
	);

	test('throws an error for an unsupported bun minor', () => {
		assert.throws(() => resolve_runtime('bun1.9.x', undefined), /Unsupported runtime: bun1.9.x/);
	});
});

describe('resolve_runtime with bun detected', () => {
	/**
	 * @param {string} bun_version
	 * @param {() => void} fn
	 */
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

describe('resolve_runtime with node detected', () => {
	/**
	 * @param {string} node_version
	 * @param {() => void} fn
	 */
	function with_node(node_version, fn) {
		const node = Object.getOwnPropertyDescriptor(process.versions, 'node');
		const bun = Object.getOwnPropertyDescriptor(process.versions, 'bun');
		Object.defineProperty(process.versions, 'node', { value: node_version, configurable: true });
		delete process.versions.bun;
		try {
			fn();
		} finally {
			if (node) Object.defineProperty(process.versions, 'node', node);
			if (bun) Object.defineProperty(process.versions, 'bun', bun);
		}
	}

	test.each([
		['22.0.0', 'nodejs22.x'],
		['24.1.0', 'nodejs24.x'],
		['26.0.0', 'nodejs26.x'],
		['96.1.0', 'nodejs96.x'],
		['98.0.0', 'nodejs98.x']
	])('detects Node %s', (version, runtime) => {
		with_node(version, () => {
			assert.equal(resolve_runtime(undefined, undefined), runtime);
		});
	});

	test.each(['18.0.0', '27.0.0'])('throws for an unsupported Node major (%s)', (version) => {
		with_node(version, () => {
			assert.throws(
				() => resolve_runtime(undefined, undefined),
				/Unsupported Node\.js version.*Please use an even Node version to build your project/
			);
		});
	});
});

describe('get_uniform_trailing_slash', () => {
	test('returns the option when every route uses it', () => {
		assert.equal(
			get_uniform_trailing_slash([{ trailingSlash: 'never' }, { trailingSlash: 'never' }]),
			'never'
		);
		assert.equal(
			get_uniform_trailing_slash([{ trailingSlash: 'always' }, { trailingSlash: 'always' }]),
			'always'
		);
	});

	test('returns undefined when routes use different options', () => {
		assert.equal(
			get_uniform_trailing_slash([{ trailingSlash: 'never' }, { trailingSlash: 'always' }]),
			undefined
		);
	});

	test('returns undefined when routes ignore trailing slashes', () => {
		assert.equal(get_uniform_trailing_slash([{ trailingSlash: 'ignore' }]), undefined);
	});

	test('returns undefined when SvelteKit does not expose the option', () => {
		assert.equal(get_uniform_trailing_slash([{}, {}]), undefined);
	});

	test('returns undefined when there are no routes', () => {
		assert.equal(get_uniform_trailing_slash([]), undefined);
	});
});

describe('trailing_slash_redirects', () => {
	test('returns no routes for no pathnames', () => {
		assert.deepEqual(trailing_slash_redirects([], false), []);
	});

	test('combines pathnames into a single route that removes the trailing slash', () => {
		assert.deepEqual(trailing_slash_redirects(['foo', 'blog/bar'], false), [
			{
				src: '^/(foo|blog/bar)/$',
				headers: { Location: '/$1' },
				status: 308,
				caseSensitive: true
			}
		]);
	});

	test('combines pathnames into a single route that adds the trailing slash', () => {
		assert.deepEqual(trailing_slash_redirects(['foo', 'blog/bar'], true), [
			{
				src: '^/(foo|blog/bar)$',
				headers: { Location: '/$1/' },
				status: 308,
				caseSensitive: true
			}
		]);
	});

	test('encodes pathnames and escapes regex characters', () => {
		const [route] = trailing_slash_redirects(['café', 'v1.2', 'a (b)', 'c+d'], false);
		assert.equal(route.src, '^/(caf%C3%A9|v1\\.2|a%20\\(b\\)|c\\+d)/$');

		const regex = new RegExp(route.src);
		assert.ok(regex.test('/v1.2/'));
		assert.ok(!regex.test('/v1x2/'));
		assert.ok(regex.test('/a%20(b)/'));
	});

	test('splits pathnames across routes when they exceed the maximum length', () => {
		const pathnames = Array.from({ length: 1000 }, (_, i) => `blog/post-${i}`);
		const routes = trailing_slash_redirects(pathnames, false);

		assert.ok(routes.length > 1);

		for (const route of routes) {
			assert.ok(route.src.length <= 4096);
		}

		const matched = pathnames.filter((pathname) =>
			routes.some((route) => new RegExp(route.src).test(`/${pathname}/`))
		);
		assert.equal(matched.length, pathnames.length);
	});
});

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { afterEach, assert, beforeEach, test, describe } from 'vitest';
import {
	create_optional_peer_dependency_checker,
	escape_src,
	parse_isr_expiration,
	pattern_to_src,
	resolve_deployment_id,
	resolve_runtime
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

	test.each([
		'node18.x',
		'nodejs028.x',
		'nodejs18.x',
		'nodejs23.x',
		'nodejs25.x',
		'nodejs100.x',
		'nodejs2,.x'
	])('throws an error when resolving to an invalid runtime (%s)', (runtime) => {
		assert.throws(() => resolve_runtime(runtime), /Unsupported runtime/);
	});

	test('accepts a minor-pinned bun runtime', () => {
		const result = resolve_runtime('bun1.4.x');
		assert.equal(result, 'bun1.4.x');
	});

	test.each(['nodejs22.x', 'nodejs24.x', 'nodejs26.x', 'nodejs27.x', 'nodejs33.x', 'nodejs99.x'])(
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
		['27.0.0', 'nodejs27.x'],
		['29.1.0', 'nodejs29.x'],
		['99.0.0', 'nodejs99.x']
	])('detects Node %s', (version, runtime) => {
		with_node(version, () => {
			assert.equal(resolve_runtime(undefined, undefined), runtime);
		});
	});

	test.each(['18.0.0', '23.0.0', '25.0.0'])(
		'throws for an unsupported Node major (%s)',
		(version) => {
			with_node(version, () => {
				assert.throws(
					() => resolve_runtime(undefined, undefined),
					/Unsupported Node\.js version.*Please use an up-to-date Node version to build your project/
				);
			});
		}
	);
});

describe('optional peer dependency warnings', () => {
	/** @type {string} */
	let dir;
	/** @type {string} */
	let importer;
	/** @type {ReturnType<typeof create_optional_peer_dependency_checker>} */
	let check;

	/** @param {string} file @param {string} content */
	function write(file, content) {
		fs.mkdirSync(path.dirname(file), { recursive: true });
		fs.writeFileSync(file, content);
	}

	beforeEach(() => {
		dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vercel-optional-peers-'));
		importer = path.join(dir, 'node_modules/fixture/dist/index.mjs');
		write(importer, '');
		write(
			path.join(dir, 'node_modules/fixture/package.json'),
			JSON.stringify({
				peerDependencies: { 'absent-optional-peer': '*', '@optional/peer': '*' },
				peerDependenciesMeta: {
					'absent-optional-peer': { optional: true },
					'@optional/peer': { optional: true }
				}
			})
		);
		check = create_optional_peer_dependency_checker();
	});

	afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

	test('recognizes scoped and unscoped optional peers, including subpaths', () => {
		for (const name of [
			'absent-optional-peer',
			'absent-optional-peer/render',
			'@optional/peer',
			'@optional/peer/render'
		]) {
			assert.equal(check(name, importer), true);
		}
	});

	test('does not suppress relative, absolute, internal or unknown imports', () => {
		for (const name of ['./absent-optional-peer', '../absent-optional-peer', '#optional']) {
			assert.equal(check(name, importer), false);
		}
		assert.equal(check(path.join(dir, 'absent-optional-peer'), importer), false);
		assert.equal(check('absent-optional-peer', '(unknown)'), false);
		assert.equal(check('absent-optional-peer', path.join(dir, 'missing.mjs')), false);
	});

	test('requires peer membership and an explicitly boolean optional flag', () => {
		write(
			path.join(dir, 'node_modules/fixture/package.json'),
			JSON.stringify({
				peerDependencies: { required: '*', truthy: '*', missing: '*' },
				peerDependenciesMeta: {
					required: { optional: false },
					truthy: { optional: 'true' },
					undeclared: { optional: true }
				},
				optionalDependencies: { optional: '*' }
			})
		);
		for (const name of ['required', 'truthy', 'missing', 'undeclared', 'optional']) {
			assert.equal(check(name, importer), false);
		}
	});

	test('uses only the nearest manifest', () => {
		write(path.join(dir, 'node_modules/fixture/dist/package.json'), '{}');
		assert.equal(check('absent-optional-peer', importer), false);
	});

	test('does not search past invalid metadata', () => {
		write(path.join(dir, 'node_modules/fixture/dist/package.json'), '{');
		assert.equal(check('absent-optional-peer', importer), false);
	});

	test('does not cross node_modules into another package', () => {
		fs.rmSync(path.join(dir, 'node_modules/fixture/package.json'));
		write(
			path.join(dir, 'package.json'),
			JSON.stringify({
				peerDependencies: { 'absent-optional-peer': '*' },
				peerDependenciesMeta: { 'absent-optional-peer': { optional: true } }
			})
		);
		assert.equal(check('absent-optional-peer', importer), false);
	});

	test('resolves symlinked importers to their own package metadata', () => {
		const link = path.join(dir, 'linked.mjs');
		fs.symlinkSync(importer, link);
		write(path.join(dir, 'package.json'), '{}');
		assert.equal(check('absent-optional-peer', link), true);
	});

	test('does not hide resolution failures for installed optional peers', () => {
		write(path.join(dir, 'node_modules/@optional/peer/package.json'), '{}');
		assert.equal(check('@optional/peer', importer), false);
		assert.equal(check('@optional/peer/missing', importer), false);
	});

	test('does not hide resolution failures for broken linked optional peers', () => {
		fs.symlinkSync(
			path.join(dir, 'missing-workspace-peer'),
			path.join(dir, 'node_modules/absent-optional-peer'),
			'junction'
		);
		assert.equal(check('absent-optional-peer', importer), false);
		assert.equal(check('absent-optional-peer/missing', importer), false);
	});

	test('does not share stale metadata between function bundles', () => {
		assert.equal(check('absent-optional-peer', importer), true);
		write(path.join(dir, 'node_modules/fixture/package.json'), '{}');
		assert.equal(
			create_optional_peer_dependency_checker()('absent-optional-peer', importer),
			false
		);
	});
});

describe('resolve_deployment_id', () => {
	test.each([undefined, '', '0', 'false', 'FALSE'])(
		'returns undefined when VERCEL_SKEW_PROTECTION_ENABLED is %j',
		(value) => {
			const env = value === undefined ? {} : { VERCEL_SKEW_PROTECTION_ENABLED: value };
			assert.equal(resolve_deployment_id('1700000000000', env), undefined);
			// invalid custom deployment IDs are ignored when skew protection is off
			assert.equal(resolve_deployment_id('a'.repeat(40), env), undefined);
			assert.equal(resolve_deployment_id('1.2.3', env), undefined);
		}
	);

	test('uses VERCEL_DEPLOYMENT_ID without marking custom when building on Vercel', () => {
		const result = resolve_deployment_id('a'.repeat(40), {
			VERCEL_SKEW_PROTECTION_ENABLED: '1',
			VERCEL_DEPLOYMENT_ID: 'dpl_abc123'
		});
		assert.deepEqual(result, { id: 'dpl_abc123', custom: false });
	});

	test.each([
		['1700000000000', '1'],
		['abc-123_XYZ', '1'],
		['DPL_123', '1'],
		['my_dpl_123', '1'],
		['a'.repeat(32), '1'],
		['release-1', 'true']
	])(
		'uses version.name as custom deploymentId for prebuilt builds (%s, enabled=%s)',
		(version_name, enabled) => {
			const result = resolve_deployment_id(version_name, {
				VERCEL_SKEW_PROTECTION_ENABLED: enabled
			});
			assert.deepEqual(result, { id: version_name, custom: true });
		}
	);

	test('falls back to version.name when VERCEL_DEPLOYMENT_ID is empty', () => {
		const result = resolve_deployment_id('build_42', {
			VERCEL_SKEW_PROTECTION_ENABLED: '1',
			VERCEL_DEPLOYMENT_ID: ''
		});
		assert.deepEqual(result, { id: 'build_42', custom: true });
	});

	test('rejects an empty version.name for prebuilt skew protection', () => {
		assert.throws(
			() => resolve_deployment_id('', { VERCEL_SKEW_PROTECTION_ENABLED: '1' }),
			/must be a non-empty string/
		);
	});

	test.each(['dpl_', 'dpl_123', 'dpl_abcdef'])(
		'rejects version.name starting with dpl_ (%s)',
		(version_name) => {
			assert.throws(
				() => resolve_deployment_id(version_name, { VERCEL_SKEW_PROTECTION_ENABLED: '1' }),
				/must not start with "dpl_"/
			);
		}
	);

	test.each(['a'.repeat(33), 'a'.repeat(40)])(
		'rejects version.name longer than 32 characters',
		(version_name) => {
			assert.throws(
				() => resolve_deployment_id(version_name, { VERCEL_SKEW_PROTECTION_ENABLED: '1' }),
				/at most 32 characters.*git rev-parse --short HEAD/
			);
		}
	);

	test.each(['1.2.3', 'v1/2', 'foo bar', 'foo; Path=/', 'v1+meta'])(
		'rejects version.name with invalid characters (%s)',
		(version_name) => {
			assert.throws(
				() => resolve_deployment_id(version_name, { VERCEL_SKEW_PROTECTION_ENABLED: '1' }),
				/alphanumeric characters/
			);
		}
	);
});

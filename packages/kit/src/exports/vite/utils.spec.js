import path from 'node:path';
import { expect, test } from 'vitest';
import { validate_config } from '../../core/config/index.js';
import { posixify } from '../../utils/os.js';
import { dedent } from '../../core/sync/utils.js';
import {
	error_for_missing_config,
	get_config_aliases,
	remote_module_pattern,
	server_only_directory_pattern,
	server_only_module_pattern
} from './utils.js';

test('transform kit.alias to resolve.alias', () => {
	const config = validate_config({
		kit: {
			alias: {
				simpleKey: 'simple/value',
				key: 'value',
				'key/*': 'value/*',
				$regexChar: 'windows\\path',
				'$regexChar/*': 'windows\\path\\*'
			}
		}
	});

	const aliases = get_config_aliases(config.kit, '.');

	const transformed = aliases.map((entry) => {
		const replacement = posixify(path.relative('.', entry.replacement));

		return {
			find: entry.find.toString(), // else assertion fails
			replacement
		};
	});

	expect(transformed).toEqual([
		{ find: 'simpleKey', replacement: 'simple/value' },
		{ find: /^key$/.toString(), replacement: 'value' },
		{ find: /^key\/(.+)$/.toString(), replacement: 'value/$1' },
		{ find: /^\$regexChar$/.toString(), replacement: 'windows/path' },
		{ find: /^\$regexChar\/(.+)$/.toString(), replacement: 'windows/path/$1' }
	]);
});

test('recognizes server-only module filenames', () => {
	expect(server_only_module_pattern.test('dir/server.js')).toBe(true);
	expect(server_only_module_pattern.test('dir/module.server.ts')).toBe(true);
	expect(server_only_module_pattern.test('dir/module.server.test.js')).toBe(true);
	expect(server_only_module_pattern.test('dir/server.test.ts')).toBe(true);
	expect(server_only_module_pattern.test('dir/module.serverish.js')).toBe(false);
	expect(server_only_module_pattern.test('dir/server/module.js')).toBe(false);
	expect(server_only_directory_pattern.test('dir/server/module.js')).toBe(true);
});

test('recognizes remote module filenames', () => {
	expect(remote_module_pattern.test('dir/remote.js')).toBe(true);
	expect(remote_module_pattern.test('dir/module.remote.ts')).toBe(true);
	expect(remote_module_pattern.test('dir/module.remote.test.js')).toBe(true);
	expect(remote_module_pattern.test('dir/module.remotely.js')).toBe(false);
	expect(remote_module_pattern.test('dir/remote/module.js')).toBe(false);
});

test('error_for_missing_config - simple single level config', () => {
	expect(() => error_for_missing_config('feature', 'adapter', 'true')).toThrow(
		dedent`
			To enable feature, add the following to your SvelteKit plugin in \`vite.config.js\`:

			adapter: true
		`
	);
});

test('error_for_missing_config - nested config', () => {
	expect(() =>
		error_for_missing_config('remote functions', 'experimental.remoteFunctions', 'true')
	).toThrow(
		dedent`
			To enable remote functions, add the following to your SvelteKit plugin in \`vite.config.js\`:

			experimental: {
			  remoteFunctions: true
			}
		`
	);
});

test('error_for_missing_config - deeply nested config', () => {
	expect(() => error_for_missing_config('deep feature', 'a.b.c.d.e', '"value"')).toThrow(
		dedent`
			To enable deep feature, add the following to your SvelteKit plugin in \`vite.config.js\`:

			a: {
			  b: {
			    c: {
			      d: {
			        e: "value"
			      }
			    }
			  }
			}
		`
	);
});

test('error_for_missing_config - two level config', () => {
	expect(() => error_for_missing_config('some feature', 'someFeature', 'false')).toThrow(
		dedent`
			To enable some feature, add the following to your SvelteKit plugin in \`vite.config.js\`:

			someFeature: false
		`
	);
});

test('error_for_missing_config - handles special characters in feature name', () => {
	expect(() =>
		error_for_missing_config('special-feature.js', 'special', '{ enabled: true }')
	).toThrow(
		dedent`
			To enable special-feature.js, add the following to your SvelteKit plugin in \`vite.config.js\`:

			special: { enabled: true }
		`
	);
});

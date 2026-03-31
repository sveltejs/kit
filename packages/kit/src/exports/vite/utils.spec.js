import path from 'node:path';
import { expect, test } from 'vitest';
import { validate_config } from '../../core/config/index.js';
import { posixify } from '../../utils/filesystem.js';
import { dedent } from '../../core/sync/utils.js';
import { get_config_aliases, get_entry_name, error_for_missing_config } from './utils.js';

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

	const aliases = get_config_aliases(config.kit);

	const transformed = aliases.map((entry) => {
		const replacement = posixify(path.relative('.', entry.replacement));

		return {
			find: entry.find.toString(), // else assertion fails
			replacement
		};
	});

	expect(transformed).toEqual([
		{ find: '$lib', replacement: 'src/lib' },
		{ find: 'simpleKey', replacement: 'simple/value' },
		{ find: /^key$/.toString(), replacement: 'value' },
		{ find: /^key\/(.+)$/.toString(), replacement: 'value/$1' },
		{ find: /^\$regexChar$/.toString(), replacement: 'windows/path' },
		{ find: /^\$regexChar\/(.+)$/.toString(), replacement: 'windows/path/$1' }
	]);
});

test('error_for_missing_config - simple single level config', () => {
	expect(() => error_for_missing_config('feature', 'kit.adapter', 'true')).toThrow(
		dedent`
			To enable feature, add the following to your \`svelte.config.js\`:

			kit: {
			  adapter: true
			}
		`
	);
});

test('error_for_missing_config - nested config', () => {
	expect(() =>
		error_for_missing_config(
			'instrumentation.server.js',
			'kit.experimental.instrumentation.server',
			'true'
		)
	).toThrow(
		dedent`
			To enable instrumentation.server.js, add the following to your \`svelte.config.js\`:

			kit: {
			  experimental: {
			    instrumentation: {
			      server: true
			    }
			  }
			}
		`
	);
});

test('error_for_missing_config - deeply nested config', () => {
	expect(() => error_for_missing_config('deep feature', 'a.b.c.d.e', '"value"')).toThrow(
		dedent`
			To enable deep feature, add the following to your \`svelte.config.js\`:

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
	expect(() => error_for_missing_config('some feature', 'kit.someFeature', 'false')).toThrow(
		dedent`
			To enable some feature, add the following to your \`svelte.config.js\`:

			kit: {
			  someFeature: false
			}
		`
	);
});

test('error_for_missing_config - handles special characters in feature name', () => {
	expect(() =>
		error_for_missing_config('special-feature.js', 'kit.special', '{ enabled: true }')
	).toThrow(
		dedent`
			To enable special-feature.js, add the following to your \`svelte.config.js\`:

			kit: {
			  special: { enabled: true }
			}
		`
	);
});

// get_entry_name: simulate Windows mixed-separator scenario.
// On Windows, kit.files.routes uses native backslashes while kit-internal
// files may be resolved with forward slashes, causing path.relative to
// return a wrong result and the '..' guard to never fire.
test('get_entry_name - file inside routes produces entries/pages name', () => {
	const routes = path.resolve('src/routes');
	const file = path.join(routes, '+page.svelte');
	expect(get_entry_name(routes, file, 'page')).toBe('entries/pages/+page.svelte');
});

test('get_entry_name - file inside routes strips .js extension', () => {
	const routes = path.resolve('src/routes');
	const file = path.join(routes, 'about/+page.server.js');
	expect(get_entry_name(routes, file, 'page')).toBe('entries/pages/about/+page.server');
});

test('get_entry_name - endpoint file inside routes produces entries/endpoints name', () => {
	const routes = path.resolve('src/routes');
	const file = path.join(routes, 'api/+server.js');
	expect(get_entry_name(routes, file, 'endpoint')).toBe('entries/endpoints/api/+server');
});

test('get_entry_name - file outside routes (e.g. kit internal) produces entries/fallbacks name', () => {
	const routes = path.resolve('src/routes');
	// Simulate a kit-internal file whose path uses forward slashes on Windows
	// (e.g. from runtime_directory which stores posix-style paths)
	const internal = path.resolve('node_modules/@sveltejs/kit/src/runtime/components/error.svelte');
	const forwardSlashInternal = internal.split(path.sep).join('/');
	expect(get_entry_name(routes, forwardSlashInternal, 'page')).toBe(
		'entries/fallbacks/error.svelte'
	);
});

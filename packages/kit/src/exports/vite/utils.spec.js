import path from 'node:path';
import { expect, test } from 'vitest';
import { validate_config } from '../../core/config/index.js';
import { posixify } from '../../utils/filesystem.js';
import { dedent } from '../../core/sync/utils.js';
import { get_config_aliases, error_for_missing_config } from './utils.js';

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

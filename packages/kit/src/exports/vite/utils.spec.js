import path from 'node:path';
import { expect, test } from 'vitest';
import { validate_config } from '../../core/config/index.js';
import { posixify } from '../../utils/filesystem.js';
import { get_config_aliases } from './utils.js';

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

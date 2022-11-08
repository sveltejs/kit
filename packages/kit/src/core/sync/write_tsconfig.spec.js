import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { validate_config } from '../config/index.js';
import { get_tsconfig_paths } from './write_tsconfig.js';

test('Creates tsconfig path aliases from kit.alias', () => {
	const config = validate_config({
		kit: {
			alias: {
				simpleKey: 'simple/value',
				key: 'value',
				'key/*': 'some/other/value/*',
				keyToFile: 'path/to/file.ts'
			}
		}
	}).kit;
	const paths = get_tsconfig_paths(config);
	// $lib isn't part of the outcome because there's a "path exists"
	// check in the implementation
	assert.equal(paths, {
		simpleKey: ['simple/value'],
		'simpleKey/*': ['simple/value/*'],
		key: ['value'],
		'key/*': ['some/other/value/*'],
		keyToFile: ['path/to/file.ts']
	});
});

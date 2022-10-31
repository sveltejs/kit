import { describe } from '../../../utils/unit_test.js';
import * as assert from 'uvu/assert';
import { remove_query_from_id, get_module_types } from './utils.js';

describe('remove_query_string_from_path', (test) => {
	const module_ids = [
		'$env/static/private',
		'some-normal-js-module.js',
		'c:\\\\some\\stupid\\windows\\path.js',
		'/some/normal/linux/path.js'
	];
	const query_module_ids = module_ids.map((module_id) => `${module_id}?hello=world,something=else`);

	test('does nothing to valid IDs', () => {
		module_ids.forEach((id) => {
			const query_stringless = remove_query_from_id(id);
			assert.equal(query_stringless, id);
		});
	});

	test('removes querystring from paths with querystrings at the end', () => {
		query_module_ids.forEach((id, i) => {
			const query_stringless = remove_query_from_id(id);
			assert.equal(query_stringless, module_ids[i]);
		});
	});
});

describe('get_module_types', (test) => {
	const base_expected_extensions = [
		'',
		'.ts',
		'.js',
		'.svelte',
		'.mts',
		'.mjs',
		'.cts',
		'.cjs',
		'.svelte.md',
		'.svx',
		'.md'
	];

	test('returns correct base extensions', () => {
		const module_types = get_module_types([]);
		base_expected_extensions.forEach((extension) => {
			assert.equal(module_types.has(extension), true);
		});
	});

	test('correctly extends base extensions', () => {
		const additional_extensions = ['.foo', '.bar', '.baz'];
		const module_types = get_module_types(additional_extensions);
		base_expected_extensions.concat(additional_extensions).forEach((extension) => {
			assert.equal(module_types.has(extension), true);
		});
	});
});

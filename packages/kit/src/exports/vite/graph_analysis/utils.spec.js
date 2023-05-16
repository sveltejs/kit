import { assert, describe } from 'vitest';
import { remove_query_from_id } from './utils.js';

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

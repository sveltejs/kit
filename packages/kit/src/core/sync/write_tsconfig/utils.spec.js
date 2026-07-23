import { assert, describe, test } from 'vitest';
import {
	extends_parent,
	get_subpath_imports,
	normalize_config,
	validate_resolved_config
} from './utils.js';

describe('normalize_config', () => {
	test('normalizes rootDirs', () => {
		assert.deepEqual(
			normalize_config('/path/to/tsconfig.json', {
				compilerOptions: {
					rootDirs: ['/path/of/my/src', '/path/of/my/generated/stuff']
				}
			}).compilerOptions.rootDirs,
			['../of/my/src', '../of/my/generated/stuff']
		);
	});

	test('normalizes paths', () => {
		assert.deepEqual(
			normalize_config('/path/to/tsconfig.json', {
				compilerOptions: {
					paths: {
						'#x': ['/path/of/my/alias']
					}
				}
			}).compilerOptions.paths,
			{
				'#x': ['../of/my/alias']
			}
		);
	});

	test('mutates a config', () => {
		const { a, b } = normalize_config(
			'/doesnt/matter',
			{
				a: 1,
				b: 2
			},
			(config) => {
				config.b += 1;
			}
		);

		assert.equal(a, 1);
		assert.equal(b, 3);
	});

	test('replaces a config', () => {
		const { a, b, c } = normalize_config(
			'/doesnt/matter',
			{
				a: 1,
				b: 2
			},
			(config) => ({ ...config, c: 3 })
		);

		assert.equal(a, 1);
		assert.equal(b, 2);
		assert.equal(c, 3);
	});
});

describe('get_subpath_imports', () => {
	test('gets normalized subpath imports', () => {
		assert.deepEqual(get_subpath_imports(import.meta.dirname + '/test-app'), {
			'#lib': 'src/lib',
			'#lib/*': 'src/lib/*'
		});
	});
});

describe('extends_parent', () => {
	const parent = 'PARENT';

	test('validates that a config extends a parent (string)', () => {
		assert.equal(extends_parent({ extends: parent }, parent), true);
	});

	test('validates that a config extends a parent (array)', () => {
		assert.equal(extends_parent({ extends: [parent] }, parent), true);
	});

	test('validates that a config does not extend a parent', () => {
		assert.equal(extends_parent({}, parent), false);
	});
});

describe('validate_resolved_config', () => {
	test('warns if types is overwritten', () => {
		const warnings = validate_resolved_config({ types: [] }, { types: ['pinky', 'perky'] });

		assert.deepEqual(warnings, ['"types" was overwritten. It must include "pinky" and "perky"']);
	});
});

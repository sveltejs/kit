import { assert, describe, test } from 'vitest';
import { normalize_config } from './utils.js';

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

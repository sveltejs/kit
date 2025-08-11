import { assert, expect, test } from 'vitest';
import { validate_config } from '../config/index.js';
import { get_tsconfig } from './write_tsconfig.js';

test('Creates tsconfig path aliases from kit.alias', async () => {
	const { kit } = await validate_config(async () => ({
		kit: {
			alias: {
				simpleKey: 'simple/value',
				key: 'value',
				'key/*': 'some/other/value/*',
				keyToFile: 'path/to/file.ts',
				$routes: '.svelte-kit/types/src/routes'
			}
		}
	}));

	const { compilerOptions } = get_tsconfig(kit);

	// $lib isn't part of the outcome because there's a "path exists"
	// check in the implementation
	expect(compilerOptions.paths).toEqual({
		'$app/types': ['./types/index.d.ts'],
		simpleKey: ['../simple/value'],
		'simpleKey/*': ['../simple/value/*'],
		key: ['../value'],
		'key/*': ['../some/other/value/*'],
		keyToFile: ['../path/to/file.ts'],
		$routes: ['./types/src/routes'],
		'$routes/*': ['./types/src/routes/*']
	});
});

test('Allows generated tsconfig to be mutated', async () => {
	const { kit } = await validate_config(async () => ({
		kit: {
			typescript: {
				config: (config) => {
					config.extends = 'some/other/tsconfig.json';
				}
			}
		}
	}));

	const config = get_tsconfig(kit);

	// @ts-expect-error
	assert.equal(config.extends, 'some/other/tsconfig.json');
});

test('Allows generated tsconfig to be replaced', async () => {
	const { kit } = await validate_config(async () => ({
		kit: {
			typescript: {
				config: (config) => ({
					...config,
					extends: 'some/other/tsconfig.json'
				})
			}
		}
	}));

	const config = get_tsconfig(kit);

	// @ts-expect-error
	assert.equal(config.extends, 'some/other/tsconfig.json');
});

test('Creates tsconfig include from kit.files', async () => {
	const { kit } = await validate_config(async () => ({
		kit: {
			files: {
				lib: 'app'
			}
		}
	}));

	const { include } = get_tsconfig(kit);

	expect(include).toEqual([
		'ambient.d.ts',
		'non-ambient.d.ts',
		'./types/**/$types.d.ts',
		'../vite.config.js',
		'../vite.config.ts',
		'../app/**/*.js',
		'../app/**/*.ts',
		'../app/**/*.svelte',
		'../src/**/*.js',
		'../src/**/*.ts',
		'../src/**/*.svelte',
		'../tests/**/*.js',
		'../tests/**/*.ts',
		'../tests/**/*.svelte'
	]);
});

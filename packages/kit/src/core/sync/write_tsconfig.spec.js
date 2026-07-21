import { assert, expect, test } from 'vitest';
import { validate_config } from '../config/index.js';
import { get_tsconfig } from './write_tsconfig.js';

test('Creates tsconfig path aliases from kit.alias', () => {
	const { kit } = validate_config({
		kit: {
			alias: {
				simpleKey: 'simple/value',
				key: 'value',
				'key/*': 'some/other/value/*',
				keyToFile: 'path/to/file.ts',
				$routes: '.svelte-kit/types/src/routes'
			}
		}
	});

	// Use a cwd without a package.json so no `#`-prefixed imports are picked up
	const { compilerOptions } = get_tsconfig(kit, import.meta.dirname);

	// No `#`-prefixed path aliases because the package.json at the test cwd
	// doesn't have an `imports` field
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

test('Creates tsconfig path aliases from package.json import map', () => {
	const { kit } = validate_config({});
	const { compilerOptions } = get_tsconfig(kit, import.meta.dirname + '/write_tsconfig_test');

	// No `#`-prefixed path aliases because the package.json at the test cwd
	// doesn't have an `imports` field
	expect(compilerOptions.paths).toEqual({
		'$app/types': ['./types/index.d.ts'],
		'#lib': ['../src/lib'],
		'#lib/*': ['../src/lib/*']
	});
});

test('Allows generated tsconfig to be mutated', () => {
	const { kit } = validate_config({
		kit: {
			typescript: {
				config: (config) => {
					config.extends = 'some/other/tsconfig.json';
				}
			}
		}
	});

	const config = get_tsconfig(kit, '.');

	// @ts-expect-error
	assert.equal(config.extends, 'some/other/tsconfig.json');
});

test('Allows generated tsconfig to be replaced', () => {
	const { kit } = validate_config({
		kit: {
			typescript: {
				config: (config) => ({
					...config,
					extends: 'some/other/tsconfig.json'
				})
			}
		}
	});

	const config = get_tsconfig(kit, '.');

	// @ts-expect-error
	assert.equal(config.extends, 'some/other/tsconfig.json');
});

test('Creates tsconfig include from kit.files', () => {
	const { kit } = validate_config({
		kit: {
			files: {
				routes: 'app'
			}
		}
	});

	const { include } = get_tsconfig(kit, '.');

	expect(include).toEqual([
		'env.d.ts',
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
		'../test/**/*.js',
		'../test/**/*.ts',
		'../test/**/*.svelte',
		'../tests/**/*.js',
		'../tests/**/*.ts',
		'../tests/**/*.svelte'
	]);
});

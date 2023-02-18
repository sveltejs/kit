import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { update_pkg_json } from './migrate_pkg.js';

test('Updates package.json', () => {
	const result = update_pkg_json(
		{ package: { dir: 'package', emitTypes: true } },
		{
			name: 'foo',
			version: '1.0.0',
			scripts: {
				packages: 'svelte-package'
			},
			exports: {
				'./ignored': './something.js'
			}
		},
		[
			{
				name: 'foo/Bar.svelte',
				dest: 'foo/Bar.svelte',
				is_exported: true,
				is_included: true,
				is_svelte: true
			},
			{
				name: 'foo/Bar2.svelte',
				dest: 'foo/Bar2.svelte',
				is_exported: false,
				is_included: false,
				is_svelte: true
			},
			{
				name: 'baz.js',
				dest: 'baz.js',
				is_exported: true,
				is_included: true,
				is_svelte: false
			},
			{
				name: 'index.js',
				dest: 'index.js',
				is_exported: true,
				is_included: true,
				is_svelte: false
			},
			{
				name: 'ignored.js',
				dest: 'ignored.js',
				is_exported: true,
				is_included: true,
				is_svelte: false
			}
		]
	);
	assert.equal(JSON.parse(JSON.stringify(result)), {
		name: 'foo',
		version: '1.0.0',
		type: 'module',
		scripts: {
			packages: 'svelte-package -o package -c'
		},
		exports: {
			'./package.json': './package.json',
			'.': {
				types: './index.d.ts',
				svelte: './index.js',
				default: './index.js'
			},
			'./foo/Bar.svelte': {
				types: './foo/Bar.svelte.d.ts',
				svelte: './foo/Bar.svelte',
				default: './foo/Bar.svelte'
			},
			'./baz': {
				types: './baz.d.ts',
				default: './baz.js'
			},
			'./ignored': './something.js'
		},
		svelte: './index.js'
	});
});

test('Updates package.json #2', () => {
	const result = update_pkg_json(
		{ package: { dir: 'dist', emitTypes: false } },
		{
			name: 'foo',
			version: '1.0.0'
		},
		[
			{
				name: 'foo/Bar.svelte',
				dest: 'foo/Bar.svelte',
				is_exported: true,
				is_included: true,
				is_svelte: true
			},
			{
				name: 'baz.js',
				dest: 'baz.js',
				is_exported: true,
				is_included: true,
				is_svelte: false
			},
			{
				name: 'index.js',
				dest: 'index.js',
				is_exported: true,
				is_included: true,
				is_svelte: false
			}
		]
	);
	assert.equal(JSON.parse(JSON.stringify(result)), {
		name: 'foo',
		version: '1.0.0',
		type: 'module',
		exports: {
			'./package.json': './package.json',
			'.': {
				svelte: './index.js',
				default: './index.js'
			},
			'./foo/Bar.svelte': {
				svelte: './foo/Bar.svelte',
				default: './foo/Bar.svelte'
			},
			'./baz': './baz.js'
		},
		svelte: './index.js'
	});
});

test.run();

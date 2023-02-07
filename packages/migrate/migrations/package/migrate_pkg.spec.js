import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { update_pkg_json } from './migrate_pkg.js';

test('Updates package.json', () => {
	const result = update_pkg_json(
		{ package: { dir: 'package' } },
		{
			name: 'foo',
			version: '1.0.0',
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
	assert.equal(result, {
		name: 'foo',
		version: '1.0.0',
		type: 'module',
		exports: {
			'./package.json': './package.json',
			'.': './package/index.js',
			'./foo/Bar.svelte': './package/foo/Bar.svelte',
			'./ignored': './something.js'
		},
		svelte: './package/index.js'
	});
});

test.run();

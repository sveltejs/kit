import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import pkg from './package.json';

const external = [].concat(
	Object.keys(pkg.dependencies || {}),
	Object.keys(process.binding('natives')),
	resolve('snowpack/pkg')
);

export default [
	{
		input: {
			navigation: 'src/runtime/navigation/index.js',
			stores: 'src/runtime/stores/index.js'
		},
		output: {
			dir: 'assets/runtime',
			format: 'esm',
			sourcemap: true,
			paths: {
				ROOT: '../generated/root.svelte',
				MANIFEST: '../generated/manifest.js'
			}
		},
		external: ['svelte', 'svelte/store', 'ROOT', 'MANIFEST'],
		plugins: [
			resolve({
				extensions: ['.mjs', '.js', '.ts']
			})
		]
	},

	{
		input: 'src/renderer/index.js',
		output: {
			dir: 'assets/renderer',
			format: 'cjs',
			sourcemap: true
		},
		plugins: [
			resolve(),
			commonjs()
		]
	},

	{
		input: ['src/cli.js'],
		output: {
			dir: 'dist',
			format: 'cjs',
			sourcemap: true,
			chunkFileNames: '[name].js',
			exports: 'named'
		},
		external: (id) => {
			if (id.includes('snowpack/snowpack')) return true;
			return external.includes(id);
		},
		plugins: [
			json(),
			resolve({
				extensions: ['.mjs', '.js', '.ts']
			}),
			commonjs()
		],
		preserveEntrySignatures: false
	}
];
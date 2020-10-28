import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import pkg from './package.json';

const external = [].concat(
	Object.keys(pkg.dependencies || {}),
	Object.keys(process.binding('natives')),
	resolve('snowpack/pkg')
);

export default [
	{
		input: {
			router: 'src/runtime/router/index.ts',
			stores: 'src/runtime/stores/index.ts'
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
		external: [
			'svelte',
			'svelte/store',
			'ROOT',
			'MANIFEST'
		],
		plugins: [
			resolve({
				extensions: ['.mjs', '.js', '.ts']
			}),
			typescript()
		]
	},

	{
		input: [
			`src/cli.ts`
		],
		output: {
			dir: 'dist',
			format: 'cjs',
			sourcemap: true,
			chunkFileNames: '[name].js'
		},
		external: id => {
			if (id.includes('snowpack/snowpack')) return true;
			return external.includes(id);
		},
		plugins: [
			json(),
			resolve({
				extensions: ['.mjs', '.js', '.ts']
			}),
			commonjs(),
			typescript()
		],
		preserveEntrySignatures: false
	}
];

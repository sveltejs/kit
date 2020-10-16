import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import sucrase from '@rollup/plugin-sucrase';
import pkg from './package.json';

const external = [].concat(
	Object.keys(pkg.dependencies || {}),
	Object.keys(process.binding('natives')),
	resolve('snowpack/pkg')
);

export default [
	{
		input: 'src/client/index.ts',
		output: {
			file: 'assets/client.js',
			format: 'esm',
			sourcemap: true,
			paths: {
				ROOT: './root.svelte',
				MANIFEST: './manifest.js'
			}
		},
		external: [
			'svelte/store',
			'ROOT',
			'MANIFEST'
		],
		plugins: [
			sucrase({ transforms: ['typescript'] })
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
			sucrase({ transforms: ['typescript'] })
		],
		preserveEntrySignatures: false
	}
];

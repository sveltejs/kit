import commonjs from '@rollup/plugin-commonjs';
import fs from 'fs';
import replace from '@rollup/plugin-replace';
import resolve from '@rollup/plugin-node-resolve';
import pkg from './package.json';

(fs.rmSync || fs.rmdirSync)('assets', { recursive: true, force: true });

const external = [].concat(
	Object.keys(pkg.dependencies || {}),
	Object.keys(pkg.peerDependencies || {}),
	Object.keys(process.binding('natives')),
	'typescript',
	'svelte2tsx'
);

export default [
	{
		input: {
			'client/start': 'src/runtime/client/start.js',
			'client/singletons': 'src/runtime/client/singletons.js',
			'app/navigation': 'src/runtime/app/navigation.js',
			'app/stores': 'src/runtime/app/stores.js',
			'app/paths': 'src/runtime/app/paths.js',
			'app/env': 'src/runtime/app/env.js',
			paths: 'src/runtime/paths.js',
			env: 'src/runtime/env.js'
		},
		output: {
			dir: 'assets',
			format: 'esm',
			chunkFileNames: 'chunks/[name].js'
		},
		external: [
			'svelte',
			'svelte/store',
			'__GENERATED__/root.svelte',
			'__GENERATED__/client-manifest.js'
		],
		plugins: [
			resolve({
				extensions: ['.mjs', '.js', '.ts']
			})
		]
	},

	{
		input: 'src/runtime/server/index.js',
		output: {
			format: 'esm',
			file: 'assets/server/index.js'
		},
		plugins: [
			resolve({
				extensions: ['.mjs', '.js', '.ts']
			}),
			commonjs()
		]
	},

	{
		input: {
			cli: 'src/cli.js',
			node: 'src/node/index.js',
			'node/polyfills': 'src/node/polyfills.js',
			hooks: 'src/hooks.js'
		},
		output: {
			dir: 'dist',
			format: 'esm',
			chunkFileNames: 'chunks/[name].js'
		},
		external: (id) => {
			return id.startsWith('node:') || external.includes(id);
		},
		plugins: [
			replace({
				preventAssignment: true,
				values: {
					__VERSION__: pkg.version,
					'process.env.BUNDLED': 'true'
				}
			}),
			resolve({
				extensions: ['.mjs', '.js', '.ts']
			}),
			commonjs()
		],
		preserveEntrySignatures: true
	}
];

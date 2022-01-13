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
			'client/start': 'src/modules/client/start.js',
			'client/singletons': 'src/modules/client/singletons.js',
			'app/navigation': 'src/modules/app/navigation.js',
			'app/stores': 'src/modules/app/stores.js',
			'app/paths': 'src/modules/app/paths.js',
			'app/env': 'src/modules/app/env.js',
			paths: 'src/modules/paths.js',
			env: 'src/modules/env.js'
		},
		output: {
			dir: 'assets',
			format: 'esm',
			chunkFileNames: 'chunks/[name].js',
			paths: {
				__ROOT__: '../../generated/root.svelte',
				__MANIFEST__: '../../generated/manifest.js'
			}
		},
		external: ['svelte', 'svelte/store', '__ROOT__', '__MANIFEST__'],
		plugins: [
			resolve({
				extensions: ['.mjs', '.js', '.ts']
			})
		]
	},

	{
		input: 'src/modules/server/index.js',
		output: {
			format: 'esm',
			file: 'assets/server/index.js'
		},
		plugins: [
			resolve({
				extensions: ['.mjs', '.js', '.ts']
			})
		]
	},

	{
		input: {
			cli: 'src/cli.js',
			node: 'src/node.js',
			hooks: 'src/hooks.js',
			'install-fetch': 'src/install-fetch.js'
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

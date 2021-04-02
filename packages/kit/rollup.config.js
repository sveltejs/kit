import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import resolve from '@rollup/plugin-node-resolve';
import pkg from './package.json';

const external = [].concat(
	Object.keys(pkg.dependencies || {}),
	Object.keys(pkg.peerDependencies || {}),
	Object.keys(process.binding('natives'))
);

export default [
	{
		input: {
			'internal/start': 'src/runtime/client/start.js',
			'internal/singletons': 'src/runtime/client/singletons.js',
			'app/navigation': 'src/runtime/app/navigation.js',
			'app/stores': 'src/runtime/app/stores.js',
			'app/paths': 'src/runtime/app/paths.js',
			'app/env': 'src/runtime/app/env.js',
			paths: 'src/runtime/paths.js',
			env: 'src/runtime/env.js'
		},
		output: {
			dir: 'assets/runtime',
			format: 'esm',
			chunkFileNames: 'chunks/[name].js',
			paths: {
				ROOT: '../../generated/root.svelte',
				MANIFEST: '../../generated/manifest.js'
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
		input: {
			cli: 'src/cli.js',
			ssr: 'src/runtime/server/index.js',
			filesystem: 'src/core/filesystem/index.js',
			http: 'src/core/http/index.js'
		},
		output: {
			dir: 'dist',
			format: 'esm',
			chunkFileNames: 'chunks/[name].js'
		},
		external: (id) => {
			return external.includes(id);
		},
		plugins: [
			replace({
				preventAssignment: true,
				values: {
					__VERSION__: pkg.version
				}
			}),
			resolve({
				extensions: ['.mjs', '.js', '.ts']
			}),
			commonjs()
		],
		preserveEntrySignatures: true
	},

	{
		input: 'src/core/filesystem/index.js',
		output: {
			format: 'cjs',
			file: 'dist/filesystem.cjs'
		},
		external: (id) => {
			return external.includes(id);
		},
		plugins: [
			replace({
				preventAssignment: true,
				delimiters: ['', ''],
				values: {
					__VERSION__: pkg.version
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

import commonjs from '@rollup/plugin-commonjs';
import fs from 'fs';
import replace from '@rollup/plugin-replace';
import resolve from '@rollup/plugin-node-resolve';
import pkg from './package.json';

(fs.rmSync || fs.rmdirSync)('dist', { recursive: true, force: true });

const external = [].concat(
	Object.keys(pkg.dependencies || {}),
	Object.keys(pkg.peerDependencies || {}),
	Object.keys(process.binding('natives')),
	'typescript',
	'svelte2tsx',
	'svelte',
	'svelte/store',
	'__GENERATED__/root.svelte',
	'__GENERATED__/client-manifest.js'
);

export default {
	input: {
		// TODO move assets to dist/assets
		'dist/runtime/client/start': 'src/runtime/client/start.js',
		'dist/runtime/client/singletons': 'src/runtime/client/singletons.js',
		'dist/runtime/app/navigation': 'src/runtime/app/navigation.js',
		'dist/runtime/app/stores': 'src/runtime/app/stores.js',
		'dist/runtime/app/paths': 'src/runtime/app/paths.js',
		'dist/runtime/app/env': 'src/runtime/app/env.js',
		'dist/runtime/env/dynamic/private': 'src/runtime/env/dynamic/private.js',
		'dist/runtime/env/dynamic/public': 'src/runtime/env/dynamic/public.js',
		'dist/runtime/env-private': 'src/runtime/env-private.js',
		'dist/runtime/env-public': 'src/runtime/env-public.js',
		'dist/runtime/paths': 'src/runtime/paths.js',
		'dist/runtime/env': 'src/runtime/env.js',
		'dist/runtime/server/index': 'src/runtime/server/index.js',

		// TODO move dist to dist/exports
		'dist/cli': 'src/cli.js',
		'dist/exports/index': 'src/index/index.js',
		'dist/exports/hooks': 'src/hooks.js',
		'dist/exports/node': 'src/node/index.js',
		'dist/exports/node/polyfills': 'src/node/polyfills.js',
		'dist/exports/prerender': 'src/core/prerender/prerender.js',
		'dist/exports/vite': 'src/vite/index.js'
	},
	output: {
		dir: '.',
		format: 'esm',
		chunkFileNames: 'dist/chunks/[name].js'
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
};

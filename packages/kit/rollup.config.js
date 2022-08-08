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
	'svelte2tsx',
	'svelte',
	'svelte/store',
	'__GENERATED__/root.svelte',
	'__GENERATED__/client-manifest.js'
);

export default {
	input: {
		// TODO move assets to dist/assets
		'assets/client/start': 'src/runtime/client/start.js',
		'assets/client/singletons': 'src/runtime/client/singletons.js',
		'assets/app/navigation': 'src/runtime/app/navigation.js',
		'assets/app/stores': 'src/runtime/app/stores.js',
		'assets/app/paths': 'src/runtime/app/paths.js',
		'assets/app/env': 'src/runtime/app/env.js',
		'assets/env/dynamic/private': 'src/runtime/env/dynamic/private.js',
		'assets/env/dynamic/public': 'src/runtime/env/dynamic/public.js',
		'assets/env-private': 'src/runtime/env-private.js',
		'assets/env-public': 'src/runtime/env-public.js',
		'assets/paths': 'src/runtime/paths.js',
		'assets/env': 'src/runtime/env.js',
		'assets/server/index': 'src/runtime/server/index.js',

		// TODO move dist to dist/exports
		'dist/cli': 'src/cli.js',
		'dist/hooks': 'src/hooks.js',
		'dist/node': 'src/node/index.js',
		'dist/node/polyfills': 'src/node/polyfills.js',
		'dist/prerender': 'src/core/prerender/prerender.js',
		'dist/vite': 'src/vite/index.js'
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

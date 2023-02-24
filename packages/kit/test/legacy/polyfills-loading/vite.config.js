import { sveltekit } from '@sveltejs/kit/vite';
import legacy from '@vitejs/plugin-legacy';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolve } from 'import-meta-resolve';
import { legacy_polyfill, modern_polyfill } from './env.js';

const core_js_modules_path = fileURLToPath(
	await resolve('core-js/modules', await resolve('@vitejs/plugin-legacy', import.meta.url))
);

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [
		sveltekit(),
		legacy({
			polyfills: legacy_polyfill,
			externalSystemJS: !legacy_polyfill,
			additionalLegacyPolyfills: legacy_polyfill
				? [path.resolve(__dirname, 'polyfills/legacy.js')]
				: undefined,
			modernPolyfills: modern_polyfill
				? [
						// The root dir for polyfills is `node_modules/core-js/modules`, so we go up by a relative path to load this script
						// Notice however that the intention of `modernPolyfills` property is only to load core-js feature, so
						//  while this is usefull for testing, you should never do this in production
						//  (see @vitejs/plugin-legacy docs for more info).
						path.relative(core_js_modules_path, path.resolve(__dirname, 'polyfills/modern'))
				  ]
				: false
		})
	],
	server: {
		fs: {
			strict: false
		}
	}
};

export default config;

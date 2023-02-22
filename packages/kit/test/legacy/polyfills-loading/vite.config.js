import { sveltekit } from '@sveltejs/kit/vite';
import legacy from '@vitejs/plugin-legacy';
import * as path from 'node:path';
import { legacy_polyfill, modern_polyfill } from './env.js';

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [
		sveltekit(),
		legacy({
			polyfills: legacy_polyfill,
			additionalLegacyPolyfills: legacy_polyfill
				? [path.resolve(__dirname, 'polyfills/legacy.js')]
				: undefined,
			modernPolyfills: modern_polyfill
				? [path.resolve(__dirname, 'polyfills/legacy.js')]
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

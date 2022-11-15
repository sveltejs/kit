import { sveltekit } from '@sveltejs/kit/vite';
import legacy from '@vitejs/plugin-legacy';

import { readBrowsersList } from '../legacy-utils.js';

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [
		sveltekit(),
		legacy({
			targets: readBrowsersList(),
			polyfills: false,
		})
	],
	server: {
		fs: {
			strict: false
		}
	}
};

export default config;

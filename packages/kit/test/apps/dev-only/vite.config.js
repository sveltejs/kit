import * as path from 'node:path';
import { sveltekit } from '@sveltejs/kit/vite';

/** @type {import('vite').UserConfig} */
const config = {
	build: {
		minify: false
	},
	clearScreen: false,
	// kit reads these auth options even without @vitejs/devtools installed
	devtools: {
		enabled: false,
		clientAuthTokens: ['devtools-e2e-token']
	},
	optimizeDeps: {
		// for CI, we need to explicitly prebundle deps, since
		// the reload confuses Playwright
		include: ['cookie']
	},
	plugins: [sveltekit({ experimental: { remoteFunctions: true } })],
	server: {
		fs: {
			allow: [path.resolve('../../../src')]
		}
	}
};

export default config;

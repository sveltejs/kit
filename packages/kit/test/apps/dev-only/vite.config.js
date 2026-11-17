import * as path from 'node:path';
import { sveltekit } from '@sveltejs/kit/vite';

/** @type {import('vite').UserConfig} */
const config = {
	build: {
		minify: false
	},
	clearScreen: false,
	devtools: {
		apply: 'serve',
		// trusted by the devtools channel test
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

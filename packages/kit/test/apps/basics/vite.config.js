import * as path from 'node:path';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	build: {
		minify: false
	},
	clearScreen: false,
	optimizeDeps: {
		// for CI, we need to explicitly prebundle deps, since
		// the reload confuses Playwright
		include: ['cookie']
	},
	plugins: [sveltekit()],
	server: {
		fs: {
			allow: [path.resolve('../../../src')]
		}
	},
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.js',
				test: {
					name: 'client',
					environment: 'browser',
					browser: {
						enabled: true,
						provider: 'playwright',
						instances: [{ browser: 'chromium' }],
						headless: true
					},
					include: ['unit-test/**/*.spec.js'],
					setupFiles: ['./vitest-setup-client.ts']
				}
			}
		]
	}
});

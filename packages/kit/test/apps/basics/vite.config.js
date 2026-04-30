import * as path from 'node:path';
import { sveltekit } from '@sveltejs/kit/vite';
import { playwright } from '@vitest/browser-playwright';
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
	plugins: [
		sveltekit({
			adapter: {
				name: 'test-adapter',
				adapt(builder) {
					builder.instrument({
						entrypoint: `${builder.getServerDirectory()}/index.js`,
						instrumentation: `${builder.getServerDirectory()}/instrumentation.server.js`,
						module: {
							exports: ['Server']
						}
					});
				},
				supports: {
					read: () => true,
					instrumentation: () => true
				}
			}
		})
	],
	server: {
		fs: {
			allow: [path.resolve('../../../src')]
		}
	},
	test: {
		expect: { requireAssertions: true },
		browser: {
			enabled: true,
			provider: playwright(),
			instances: [{ browser: 'chromium' }],
			headless: true
		},
		include: ['unit-test/**/*.spec.js']
	}
});

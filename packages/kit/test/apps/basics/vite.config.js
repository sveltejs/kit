import process from 'node:process';
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
			},

			compilerOptions: {
				experimental: { async: process.env.SVELTE_ASYNC === 'true' }
			},

			experimental: {
				remoteFunctions: true,
				tracing: {
					server: true
				},
				instrumentation: {
					server: true
				}
			},

			csrf: {
				trustedOrigins: ['https://trusted.example.com', 'https://payment-gateway.test']
			},

			prerender: {
				entries: [
					'*',
					'/routing/prerendered/trailing-slash/always/',
					'/routing/prerendered/trailing-slash/never',
					'/routing/prerendered/trailing-slash/ignore'
				],
				handleHttpError: ({ path, message }) => {
					if (path.includes('/reroute/async')) {
						throw new Error('shouldnt error on ' + path);
					}

					console.warn(message);
				}
			},
			serviceWorker: {
				register: true,
				options: {
					updateViaCache: 'imports'
				}
			},

			version: {
				name: 'TEST_VERSION'
			},

			router: {
				resolution: /** @type {'client' | 'server'} */ (process.env.ROUTER_RESOLUTION) || 'client'
			},

			typescript: {
				config: (config) => {
					config.include.push('../unit-test');
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

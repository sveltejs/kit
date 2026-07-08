import process from 'node:process';
import * as path from 'node:path';
import { sveltekit } from '@sveltejs/kit/vite';

/** @type {import('vitest/config').ViteUserConfig} */
const config = {
	build: {
		minify: false,
		assetsInlineLimit: 0
	},
	clearScreen: false,
	plugins: [
		sveltekit({
			compilerOptions: {
				experimental: {
					async: true
				}
			},
			csp: {
				directives: {
					'script-src': ['self'],
					'require-trusted-types-for': ['script'],
					'trusted-types': ['svelte-trusted-html']
				}
			},
			embedded: true,
			extensions: ['.jesuslivesineveryone', '.whokilledthemuffinman', '.svelte.md', '.svelte'],
			files: {
				src: 'source',
				assets: 'public',
				lib: 'source/components',
				routes: 'source/pages',
				appTemplate: 'source/template.html',
				hooks: {
					client: 'source/hooks.client.js',
					server: 'source/hooks.server.js'
				},
				// while we specify a path for the service worker, we expect it to not exist in the test
				serviceWorker: 'source/service-worker'
			},
			appDir: '_wheee/nested',
			inlineStyleThreshold: 1024,
			outDir: '.custom-out-dir',
			paths: {
				base: '/path-base',
				// @ts-expect-error our env var string can't match the https template literal
				assets: process.env.PATHS_ASSETS || ''
			},
			env: {
				dir: './env-dir'
			},
			router: {
				resolution: /** @type {'client' | 'server'} */ (process.env.ROUTER_RESOLUTION) || 'client'
			}
		})
	],
	server: {
		fs: {
			allow: [path.resolve('../../../src')]
		}
	},
	test: {
		include: ['./unit-test/*.spec.js']
	}
};

export default config;

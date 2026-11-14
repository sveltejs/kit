import * as path from 'node:path';
import { sveltekit } from '@sveltejs/kit/vite';

/** @type {import('vite').UserConfig} */
const config = {
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
				adapt: () => {},
				dev: {
					respond: (request, { resolve }) => {
						if (new URL(request.url).pathname === '/adapter-respond') {
							return Promise.resolve(new Response('rendered by the adapter'));
						}

						return resolve(request);
					}
				}
			},
			experimental: { remoteFunctions: true }
		})
	],
	server: {
		fs: {
			allow: [path.resolve('../../../src')]
		}
	}
};

export default config;

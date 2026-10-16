import * as path from 'node:path';
import { sveltekit } from '@sveltejs/kit/vite';
import { getRequest } from '@sveltejs/kit/node';

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
				vite: {
					getRequest: (options) => {
						// Throw outside the runtime's error handling to exercise the middleware fallback.
						if (options.request.url?.startsWith('/fallback-error/')) {
							const error = new Error('Está vacía. Formato: Server=…;Database=… <b>error</b>');
							if (options.request.url.endsWith('/stackless')) error.stack = '';
							throw error;
						}

						return getRequest(options);
					}
				}
			}
		})
	],
	server: {
		fs: {
			allow: [path.resolve('../../../src')]
		}
	}
};

export default config;

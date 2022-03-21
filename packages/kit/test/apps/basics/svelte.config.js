import path from 'path';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		prerender: {
			onError: 'continue'
		},
		vite: {
			build: {
				minify: false
			},
			clearScreen: false,
			optimizeDeps: {
				// for CI, we need to explicitly prebundle deps, since
				// the reload confuses Playwright
				include: ['cookie', 'marked']
			},
			server: {
				fs: {
					allow: [path.resolve('../../../src')]
				}
			}
		},
		methodOverride: {
			allowed: ['PUT', 'PATCH', 'DELETE']
		}
	}
};

export default config;

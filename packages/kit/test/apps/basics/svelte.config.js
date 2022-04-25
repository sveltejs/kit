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
				// TODO: required to support ipv6, remove on vite 3
				// https://github.com/vitejs/vite/issues/7075
				host: 'localhost',
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

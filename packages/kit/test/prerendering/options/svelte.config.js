import path from 'path';
import adapter from '../../../../adapter-static/index.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),

		csp: {
			directives: {
				'script-src': ['self']
			}
		},

		paths: {
			base: '/path-base',
			assets: 'https://cdn.example.com/stuff'
		},

		trailingSlash: 'always',

		vite: {
			build: {
				minify: false
			},
			clearScreen: false,
			server: {
				fs: {
					allow: [path.resolve('../../../src')]
				}
			}
		}
	}
};

export default config;
